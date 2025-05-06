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
        :columns="columns"
        :data-source="alerts"
        :loading="loading"
        rowKey="id"
        :pagination="{ pageSize: 10 }"
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
          
          <!-- Time column -->
          <template v-else-if="column.key === 'time'">
            {{ formatTime(record.triggered_at) }}
          </template>
        </template>
      </a-table>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
  import api from '@/services/api';
  import { message } from 'ant-design-vue';
  
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
  
  // Computed properties
  const uniqueHosts = computed(() => {
    const hostSet = new Set();
    alerts.value.forEach(alert => hostSet.add(alert.host));
    return Array.from(hostSet);
  });
  
  // Table columns definition
  const columns = [
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
    }
  ];
  
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