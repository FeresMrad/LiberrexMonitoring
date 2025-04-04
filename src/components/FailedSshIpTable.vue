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
            <tr v-for="(count, ip) in ipCounts" :key="ip">
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
  
  const props = defineProps({
    host: {
      type: String,
      required: true
    }
  })
  
  const loading = ref(true)
  const error = ref(null)
  const ipCounts = ref({})
  
  const fetchFailedSSHData = async () => {
    loading.value = true
    error.value = null
    ipCounts.value = {}
    
    try {
      const response = await fetch(
        `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=15m`
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      
      const text = await response.text()
      const lines = text.trim().split("\n")
      
      // Regular expression to extract the IP address from the log line.
      // It matches the IP after "from " (e.g., "from 192.168.1.1")
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
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  
  thead {
    background-color: #f2f2f2;
  }
  
  th, td {
    padding: 8px;
    border: 1px solid #ccc;
  }
  
  th {
    font-weight: bold;
    background-color: #008fca;
    color:white
  }
  
  </style>
  