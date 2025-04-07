<template>
  <div class="failed-ssh-ip-table">
    <h3>Failed Connections - Unique IP</h3>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">Error: {{ error }}</div>
    <div v-else>
      <table>
        <thead>
          <tr>
            <th>IP Address</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="([ip, count]) in sortedIpCounts" :key="ip">
            <td>{{ ip }}</td>
            <td>{{ count }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineProps } from 'vue'
import api from '@/services/api'

const props = defineProps({
  host: {
    type: String,
    required: true
  },
  timeRange: {
    type: [String, Object],
    default: '60m'
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const loading = ref(true)
const error = ref(null)
const sortedIpCounts = ref([])

const fetchFailedSSHData = async () => {
  loading.value = true
  error.value = null

  try {
    // Use the API method which now supports timeRange
    const response = await api.getSshFailedIps(props.host, props.timeRange)
    sortedIpCounts.value = response.data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Fetch data on mount and when props change
onMounted(fetchFailedSSHData)

// Watch for changes in timeRange or refreshTrigger
watch([() => props.timeRange, () => props.refreshTrigger], fetchFailedSSHData)
</script>

<style scoped>
.failed-ssh-ip-table {
  text-align: center;
  padding: 10px;
  max-width: 500px;
  margin-top: -5px;
}

/* Table layout */
table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 5px;
}

/* Sticky header */
thead {
  background-color: #008fca;
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;
}

th, td {
  padding: 8px;
  border-bottom: 1px solid #ccc;
  border-left: 1px solid #ccc;
  border-right: 1px solid #ccc;
}

/* Column-specific styling */
td:first-child,
th:first-child {
  text-align: left;
  border-right: none; /* remove separator between columns */
  padding-left: 20px;
}

td:last-child,
th:last-child {
  text-align: center;
  border-left: none; /* remove separator between columns */
}

/* Make only the tbody scrollable */
tbody {
  display: block;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
}

/* Ensure rows align with header */
thead, tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}
</style>