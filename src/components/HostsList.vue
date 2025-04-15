<template>
  <a-table :columns="hostsColumns" :data-source="hostsData" :pagination="false">
    <template v-slot:bodyCell="{ column, text, record }">
      <template v-if="column.key === 'activity'">
        <span :class="text.isDown ? 'activity down' : 'activity up'">
          {{ text.isDown ? text.timestamp : "Active" }}
        </span>
      </template>

      <template v-if="column.key === 'hostName'">
        <div class="host-name-cell">
          <!-- View mode -->
          <div v-if="!isEditing(record)" class="host-name-view">
            <a @click="redirectToHostPage(record.name)">
              <span v-if="record.customName">{{ record.customName }}</span>
              <span v-else class="host-id">{{ record.name }}</span>
            </a>
            <a-tooltip v-if="!record.customName" title="Using agent ID (no custom name)">
              <info-circle-outlined class="info-icon" />
            </a-tooltip>
          </div>
          
          <!-- Edit mode -->
          <div v-else class="host-name-edit">
            <a-input 
              v-model:value="editName" 
              placeholder="Enter custom name" 
              :maxLength="30"
              @pressEnter="saveHostName(record)"
            />
            <div class="edit-actions">
              <check-outlined class="save-icon" @click="saveHostName(record)" />
              <close-outlined class="cancel-icon" @click="cancelEditing()" />
            </div>
          </div>
        </div>
      </template>

      <!-- Gauge Chart for CPU Usage -->
      <template v-if="column.key === 'cpuUsage'">
        <a-progress 
          :percent="text" 
          type="dashboard" 
          :stroke-color="getColor(text)" 
          size="small" 
        />
      </template>

      <!-- Gauge Chart for Memory Usage -->
      <template v-if="column.key === 'memoryUsage'">
        <a-progress 
          :percent="text" 
          type="dashboard" 
          :stroke-color="getColor(text)" 
          size="small" 
        />
      </template>

      <!-- Gauge Chart for Disk Usage -->
      <template v-if="column.key === 'diskUsage'">
        <a-progress 
          :percent="text" 
          type="dashboard" 
          :stroke-color="getColor(text)" 
          size="small" 
        />
      </template>

      <!-- Actions Column -->
      <template v-if="column.key === 'actions'">
        <div class="action-buttons">
          <!-- Edit Button -->
          <a-button 
            type="danger" 
            size="small"
            @click.stop="startEditing(record)"
            class="action-button"
          >
            <edit-outlined />
          </a-button>
          
          <!-- Delete Button -->
          <a-button 
            type="danger" 
            size="small"
            @click.stop="showDeleteConfirm(record)"
            class="action-button"
          >
            <delete-outlined />
          </a-button>
        </div>
      </template>
    </template>
  </a-table>
  
  <!-- Delete Confirmation Modal -->
  <a-modal
    v-model:open="deleteModalVisible"
    title="Delete Host"
    :confirm-loading="deletingHost"
    @ok="confirmDeleteHost"
    @cancel="cancelDeleteHost"
    okText="Delete"
    cancelText="Cancel"
    okType="danger"
  >
    <div class="delete-confirmation">
      <exclamation-circle-outlined class="warning-icon" />
      <h3>Are you sure you want to delete this host?</h3>
      <p>
        This will permanently delete 
        <strong v-if="hostToDelete.customName">
          {{ hostToDelete.customName }} ({{ hostToDelete.name }})
        </strong>
        <strong v-else>
          {{ hostToDelete.name }}
        </strong> 
        and all its monitoring data. This action cannot be undone.
      </p>
      <p>
        NB: This will only delete historical data. If you wish to stop monitoring this host, you will have to uninstall the agent on such host.
      </p>
      <div class="host-info" v-if="hostToDelete.name">
        <p><b>Host Name:</b> {{ hostToDelete.customName }}</p>
        <p><b>Agent ID:</b> {{ hostToDelete.name }}</p>
        <p><b>IP Address:</b> {{ hostToDelete.ip || 'Unknown' }}</p>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { 
  InfoCircleOutlined, 
  EditOutlined, 
  CheckOutlined, 
  CloseOutlined, 
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';

const router = useRouter();
const hostsData = ref([]);
const editingHostId = ref(null);
const editName = ref('');

// Delete host related variables
const deleteModalVisible = ref(false);
const deletingHost = ref(false);
const hostToDelete = ref({});

const hostsColumns = ref([
  { title: "Host Name", dataIndex: "name", key: "hostName" },
  { title: "IP Address", dataIndex: "ip", key: "ip" },
  { title: "CPU", dataIndex: "cpuUsage", key: "cpuUsage" },
  { title: "Memory", dataIndex: "memoryUsage", key: "memoryUsage" },
  { title: "Disk", dataIndex: "diskUsage", key: "diskUsage" },
  { title: "System Boot", dataIndex: "systemBoot", key: "systemBoot" },
  { title: "Activity", dataIndex: "activity", key: "activity" },
  { 
    title: "Actions", 
    key: "actions",
    width: 100,
    align: 'center'
  }
]);

const fetchHosts = async () => {
  try {
    const response = await api.getHosts();
    hostsData.value = response.data;
  } catch (error) {
    console.error("Error fetching hosts:", error);
  }
};

const redirectToHostPage = hostName => {
  router.push(`/entities/${hostName}`);
};

const getColor = (value) => {
  if (value < 50) return "#52c41a"; // Green
  if (value >= 50 && value < 80) return "#faad14"; // Orange
  return "#ff4d4f"; // Red
};

// Host name editing functions
const isEditing = (record) => {
  return editingHostId.value === record.name;
};

const startEditing = (record) => {
  editingHostId.value = record.name;
  editName.value = record.customName || '';
};

const cancelEditing = () => {
  editingHostId.value = null;
  editName.value = '';
};

const saveHostName = async (record) => {
  try {
    // Validate input - trim whitespace
    const trimmedName = editName.value.trim();
    
    // Optional: Add more validation as needed
    if (trimmedName === '' && record.customName) {
      // If clearing the name, confirm
      if (!confirm('Remove custom name? Host will use ID instead.')) {
        return;
      }
    }
    
    // Call API to update host name
    await api.updateHostName(record.name, trimmedName);
    
    // Update local data
    const hostIndex = hostsData.value.findIndex(h => h.name === record.name);
    if (hostIndex !== -1) {
      hostsData.value[hostIndex].customName = trimmedName || null;
    }
    
    // Show success message
    message.success(`Host name ${trimmedName ? 'updated' : 'removed'} successfully`);
    
    // Exit edit mode
    cancelEditing();
  } catch (error) {
    console.error("Error updating host name:", error);
    message.error("Failed to update host name");
  }
};

// Delete host functions
const showDeleteConfirm = (record) => {
  hostToDelete.value = { ...record };
  deleteModalVisible.value = true;
};

const confirmDeleteHost = async () => {
  if (!hostToDelete.value.name) return;
  
  deletingHost.value = true;
  
  try {
    await api.deleteHost(hostToDelete.value.name);
    
    // Remove host from local data
    hostsData.value = hostsData.value.filter(host => host.name !== hostToDelete.value.name);
    
    // Show success message
    message.success(`Host "${hostToDelete.value.customName || hostToDelete.value.name}" deleted successfully`);
    
    // Close modal
    deleteModalVisible.value = false;
  } catch (error) {
    console.error("Error deleting host:", error);
    message.error("Failed to delete host. Please try again.");
  } finally {
    deletingHost.value = false;
  }
};

const cancelDeleteHost = () => {
  deleteModalVisible.value = false;
  hostToDelete.value = {};
};

onMounted(fetchHosts);
</script>

<style scoped>
.activity {
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-weight: bold;
  text-align: center;
}

.activity.up {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.activity.down {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.host-id {
  font-family: monospace;
  color: #666;
}

.info-icon {
  font-size: 12px;
  margin-left: 4px;
  color: #aaa;
}

.host-name-cell {
  display: flex;
  align-items: center;
  min-width: 200px;
}

.host-name-view {
  display: flex;
  align-items: center;
  width: 100%;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.host-name-edit {
  display: flex;
  align-items: center;
  width: 100%;
}

.edit-actions {
  display: flex;
  margin-left: 8px;
}

.save-icon, .cancel-icon {
  margin: 0 4px;
  cursor: pointer;
}

.save-icon {
  color: #52c41a;
}

.cancel-icon {
  color: #ff4d4f;
}

/* Delete confirmation modal styling */
.delete-confirmation {
  text-align: center;
  padding: 10px;
}

.warning-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 16px;
}

.host-info {
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 10px;
  margin-top: 16px;
  text-align: left;
}

.host-info p {
  margin: 5px 0;
}
</style>