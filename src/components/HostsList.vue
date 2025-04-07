<template>
  <a-table :columns="hostsColumns" :data-source="hostsData" :pagination="false">
    <template v-slot:bodyCell="{ column, text, record }">
      <template v-if="column.key === 'activity'">
        <span :class="text.isDown ? 'activity down' : 'activity up'">
          {{ text.isDown ? text.timestamp : "Active" }}
        </span>
      </template>

      <template v-if="column.key === 'name'">
        <a @click="redirectToHostPage(record.name)">
          {{ text }}
        </a>
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
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import api from '@/services/api';

const router = useRouter();
const hostsData = ref([]);

const hostsColumns = ref([
  { title: "Hosts", dataIndex: "name", key: "name" },
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
</style>