<template>
    <div class="failed-ssh">
      <h3>Total Failed Connections - Unique IP</h3>
      <p v-if="loading">Loading...</p>
      <p v-else-if="error">Error: {{ error }}</p>
      <p v-else class="count">{{ uniqueCount }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps } from 'vue'
  
  const props = defineProps({
    host: String
  })
  
  const uniqueCount = ref(0)
  const loading = ref(true)
  const error = ref(null)
  
  const fetchUniqueFailedSSH = async () => {
    loading.value = true
    error.value = null
    uniqueCount.value = 0
  
    try {
      const response = await fetch(
        `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=5m`
      )
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
  
      const text = await response.text() // Get raw NDJSON response
      const lines = text.trim().split("\n")
      
      // Use a Set to store unique IP addresses
      const ipSet = new Set()
      
      // Regex pattern to extract IP addresses (works for both log formats)
      const ipRegex = /from\s+(\d+\.\d+\.\d+\.\d+)/i
      
      for (const line of lines) {
        const match = ipRegex.exec(line)
        if (match && match[1]) {
          ipSet.add(match[1])
        }
      }
      
      uniqueCount.value = ipSet.size
  
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Fetch data on mount and when `host` changes
  onMounted(fetchUniqueFailedSSH)
  watch(() => props.host, fetchUniqueFailedSSH)
  </script>
  
  <style scoped>
  .failed-ssh {
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #ffe5e5;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin: 0;
    font-size: 18px;
  }
  
  .count {
    font-size: 24px;
    font-weight: bold;
    color: red;
    margin-top: 10px;
  }
  </style>
  