<!-- src/components/AlertsTable.vue -->
<template>
  <div class="alerts-table-container">
    <!-- Status filter -->
    <div class="filters">
      <a-radio-group v-model:value="statusFilter" @change="handleFilterChange">
        <a-radio-button value="all">All</a-radio-button>
        <a-radio-button value="triggered">Active</a-radio-button>
        <a-radio-button value="resolved">Resolved</a-radio-button>
      </a-radio-group>
      
      <!-- Host filter - only show if there are alerts from multiple hosts -->
      <a-select
        v-if="uniqueHosts.length > 1"
        v-model:value="hostFilter"
        style="width: 200px; margin-left: 16px;"
        placeholder="All Hosts"
        allowClear
        @change="handleFilterChange"
      >
        <a-select-option v-for="host in uniqueHosts" :key="host" :value="host">
          {{ hostsMap[host] || host }}
        </a-select-option>
      </a-select>
    </div>
    
    <!-- Alert list -->
    <a-table
      :columns="allColumns.filter(col => col.key !== 'actions' || isAdmin)"
      :data-source="alerts"
      :loading="loading"
      rowKey="id"
      :pagination="{ pageSize: 10 }"
      size="small"
    >
      <!-- Custom cell rendering for columns -->
      <template #bodyCell="{ column, text, record }">
        <!-- Host column - show custom name first, or host ID -->
        <template v-if="column.key === 'host'">
          {{ hostsMap[text] || text }}
        </template>
        
        <!-- Status column -->
        <template v-else-if="column.key === 'status'">
          <a-tag :color="getStatusColor(text)"> {{ text === 'triggered' ? 'Active' : text === 'resolved' ? 'Resolved' : text }}</a-tag>
        </template>
        
        <!-- Message column - generate message in frontend with HTML -->
        <template v-else-if="column.key === 'message'">
          <span v-html="generateAlertMessage(record)"></span>
        </template>
        
        <!-- Time column -->
        <template v-else-if="column.key === 'time'">
          {{ formatTime(record.triggered_at) }}
        </template>

        <!-- Actions column - delete button -->
        <template v-else-if="column.key === 'actions'">
          <a-button 
            v-if="isAdmin"
            type="danger" 
            size="small" 
            @click="showDeleteConfirm(record)"
            :disabled="deleteLoading === record.id"
          >
            <template #icon><delete-outlined /></template>
          </a-button>
        </template>
      </template>
    </a-table>

    <!-- Delete confirmation modal - only used by admins -->
    <a-modal
      v-if="isAdmin"
      v-model:open="deleteModalVisible"
      title="Delete Alert"
      :confirmLoading="Boolean(deleteLoading)"
      @ok="confirmDeleteAlert"
      @cancel="cancelDeleteAlert"
      okText="Delete"
      okType="danger"
    >
      <p>Are you sure you want to delete this alert?</p>
      <p>This action cannot be undone.</p>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
import { DeleteOutlined } from '@ant-design/icons-vue';
import api from '@/services/api';
import { message } from 'ant-design-vue';
import authService from '@/services/auth';

// Props from parent component
const props = defineProps({
  // We can pass these if needed from parent component
  initialStatusFilter: {
    type: String,
    default: 'all'
  },
  initialHostFilter: {
    type: String,
    default: null
  }
});

// Events to communicate with parent component
const emit = defineEmits(['refresh']);

// Reactive state
const alerts = ref([]);
const loading = ref(true);
const statusFilter = ref(props.initialStatusFilter);
const hostFilter = ref(props.initialHostFilter);

// Host information for displaying custom names
const hosts = ref([]);
const hostsMap = ref({});

// Delete confirmation modal state
const deleteModalVisible = ref(false);
const deleteLoading = ref(null); // Will store alert ID during deletion
const alertToDelete = ref(null);

// Check if user is admin
const isAdmin = computed(() => authService.isAdmin());

// Computed properties
const uniqueHosts = computed(() => {
  const hostSet = new Set();
  alerts.value.forEach(alert => hostSet.add(alert.host));
  return Array.from(hostSet);
});

// Define all table columns
const allColumns = [
  {
    title: 'Host',
    dataIndex: 'host',
    key: 'host',
    width: 150
  },
  {
    title: 'Alert',
    dataIndex: 'rule_name',
    key: 'rule_name',
    width: 180  // Set a reasonable fixed width to prevent taking too much space
  },
  {
    title: 'Message',
    dataIndex: 'message',
    key: 'message',
    // No ellipsis to show full message text
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120
  },
  {
    title: 'Time',
    key: 'time',
    width: 150
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    align: 'center'
  }
];

// Generate alert message based on available data
const generateAlertMessage = (alert) => {
  // If we have all the necessary fields, generate the message
  if (alert.metric_type && alert.host && alert.value !== undefined && 
      alert.threshold !== undefined && alert.comparison) {
    
    // Format the metric name (replace dots with spaces, ALL CAPS)
    const metricName = alert.metric_type
      .replace('.', ' ')
      .toUpperCase();
    
    // Get comparison symbol
    const comparisonSymbol = {
      'above': '>',
      'below': '<',
      'equal': '='
    }[alert.comparison] || '≠';
    
    // Format the value with appropriate units
    const value = alert.metric_type.includes('percent') ? 
      `${alert.value}%` : alert.value.toString();
    
    // Format the threshold with the same units
    const threshold = alert.metric_type.includes('percent') ? 
      `${alert.threshold}%` : alert.threshold.toString();
    
    // Format the message with a cleaner approach
    return `${metricName}: <strong>${value}</strong> ${comparisonSymbol} ${threshold}`;
  }
  
  // Fallback: If we don't have all the fields, use the original message
  return alert.message;
};

// Fetch alerts from the API
const fetchAlerts = async () => {
  loading.value = true;
  
  try {
    // Prepare query parameters
    const params = {};
    if (statusFilter.value !== 'all') {
      params.status = statusFilter.value;
    }
    if (hostFilter.value) {
      params.host = hostFilter.value;
    }
    
    // Fetch alerts
    const response = await api.getAlerts(params);
    alerts.value = response.data;
    
    // Ensure we have host information for displaying custom names
    if (alerts.value.length > 0) {
      fetchHosts();
    }
    
    // Emit refresh event to parent
    emit('refresh');
  } catch (error) {
    console.error('Error fetching alerts:', error);
    message.error('Failed to load alerts');
  } finally {
    loading.value = false;
  }
};

// Fetch hosts to get custom names
const fetchHosts = async () => {
  try {
    const response = await api.getHosts();
    hosts.value = response.data;
    
    // Create a map of host ID to custom name for quick lookup
    hostsMap.value = response.data.reduce((map, host) => {
      map[host.name] = host.customName || host.name;
      return map;
    }, {});
  } catch (error) {
    console.error('Error fetching hosts:', error);
  }
};

// Handler for filter changes
const handleFilterChange = () => {
  fetchAlerts();
};

// Delete alert functions - only accessible to admins
const showDeleteConfirm = (alert) => {
  // Extra check to ensure only admins can delete
  if (!isAdmin.value) return;
  
  alertToDelete.value = alert;
  deleteModalVisible.value = true;
};

const confirmDeleteAlert = async () => {
  // Extra check to ensure only admins can delete
  if (!isAdmin.value || !alertToDelete.value) return;
  
  deleteLoading.value = alertToDelete.value.id;
  
  try {
    await api.deleteAlert(alertToDelete.value.id);
    
    // Remove from local state
    alerts.value = alerts.value.filter(alert => alert.id !== alertToDelete.value.id);
    
    message.success('Alert deleted successfully');
    deleteModalVisible.value = false;
    alertToDelete.value = null;
  } catch (error) {
    console.error('Error deleting alert:', error);
    message.error('Failed to delete alert: ' + (error.response?.data?.error || 'Unknown error'));
  } finally {
    deleteLoading.value = null;
  }
};

const cancelDeleteAlert = () => {
  deleteModalVisible.value = false;
  alertToDelete.value = null;
};

// Helper functions
const getStatusColor = (status) => {
  const colors = {
    'triggered': 'red',
    'resolved': 'green'
  };
  return colors[status] || 'default';
};

const formatTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleString('en-GB');
};

// Expose methods for parent component
defineExpose({
  fetchAlerts,
  fetchHosts
});

// Lifecycle hooks
onMounted(() => {
  fetchAlerts();
  fetchHosts(); // Fetch hosts on mount to get custom names
});
</script>

<style scoped>
.alerts-table-container {
  width: 100%;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
</style>