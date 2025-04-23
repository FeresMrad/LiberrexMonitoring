<template>
  <div>
    <table>
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Status / Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Memory</td>
          <td>{{ memoryCurrent.toFixed(1) }}/{{ memoryMax.toFixed(1) }} GB</td>
        </tr>
        <tr>
          <td>Disk</td>
          <td>{{ diskCurrent.toFixed(1) }}/{{ diskMax.toFixed(1) }} GB</td>
        </tr>
        <tr>
          <td>IP Address</td>
          <td>{{ ipAddress }}</td>
        </tr>
        <tr>
          <td>System Boot Time</td>
          <td>{{ uptime }}</td>
        </tr>
        <tr>
          <td>SSH</td>
          <td><router-link :to="`/entities/${props.host}/sshdetails`">Details</router-link></td>
        </tr>
        <tr>
          <td>Apache</td>
          <td><router-link :to="`/entities/${props.host}/apachedetails`">Details</router-link></td>
        </tr>
        <tr>
          <td>Agent ID</td>
          <td>{{ host }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue';
import api from '@/services/api';

const props = defineProps({
  host: {
    type: String,
    required: true
  }
});

const memoryCurrent = ref(0);
const memoryMax = ref(0);
const diskCurrent = ref(0);
const diskMax = ref(0);
const ipAddress = ref('Unknown');
const uptime = ref('Unknown');

const fetchData = async () => {
  try {
    const response = await api.getHostSpecs(props.host);
    
    // Update values from API response
    memoryCurrent.value = response.data.memoryCurrent;
    memoryMax.value = response.data.memoryMax;
    diskCurrent.value = response.data.diskCurrent;
    diskMax.value = response.data.diskMax;
    ipAddress.value = response.data.ipAddress;
    uptime.value = response.data.uptime;
  } catch (error) {
    console.error("Error fetching specs data:", error);
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
th {
  background-color: #008fca;
  color: white;
}
</style>