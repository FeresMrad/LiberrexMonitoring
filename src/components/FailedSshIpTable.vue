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
import { ref, onMounted, watch, defineProps, computed } from 'vue'

const props = defineProps({
  host: {
    type: String,
    required: true
  }
})

const loading = ref(true)
const error = ref(null)
const ipCounts = ref({})

// Sort ipCounts into array [ip, count] descending by count
const sortedIpCounts = computed(() => {
  return Object.entries(ipCounts.value).sort((a, b) => b[1] - a[1])
})

const fetchFailedSSHData = async () => {
  loading.value = true
  error.value = null
  ipCounts.value = {}

  try {
    const response = await fetch(
      `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=60m`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const text = await response.text()
    const lines = text.trim().split('\n')

    const ipRegex = /from\s+(\d{1,3}(?:\.\d{1,3}){3})/i

    lines.forEach(line => {
      const match = ipRegex.exec(line)
      if (match && match[1]) {
        const ip = match[1]
        ipCounts.value[ip] = (ipCounts.value[ip] || 0) + 1
      }
    })

  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchFailedSSHData)
watch(() => props.host, fetchFailedSSHData)

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
