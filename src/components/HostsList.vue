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
            <a-tooltip v-if="!record.customName" title="Using host ID (no custom name)">
              <info-circle-outlined class="info-icon" />
            </a-tooltip>
            <a-tooltip title="Edit host name">
              <edit-outlined class="edit-icon" @click.stop="startEditing(record)" />
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
    </template>
  </a-table>
  
  <!-- Success message -->
  <a-message></a-message>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { InfoCircleOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import api from '@/services/api';

const router = useRouter();
const hostsData = ref([]);
const editingHostId = ref(null);
const editName = ref('');

const hostsColumns = ref([
  { title: "Host Name", dataIndex: "name", key: "hostName" },
  { title: "IP Address", dataIndex: "ip", key: "ip" },
  { title: "CPU", dataIndex: "cpuUsage", key: "cpuUsage" },
  { title: "Memory", dataIndex: "memoryUsage", key: "memoryUsage" },
  { title: "Disk", dataIndex: "diskUsage", key: "diskUsage" },
  { title: "System Boot", dataIndex: "systemBoot", key: "systemBoot" },
  { title: "Activity", dataIndex: "activity", key: "activity" }
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
    // Note: You'll need to implement this API endpoint
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

.edit-icon {
  color: #aaa;
  margin-left: 8px;
  cursor: pointer;
  visibility: hidden;
}

.host-name-view:hover .edit-icon {
  visibility: visible;
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
</style>