<template>
    <div class="failed-ssh">
      <h3>Failed Connections</h3>
      <p v-if="loading">Loading...</p>
      <p v-else-if="error">Error: {{ error }}</p>
      <p v-else class="count">{{ failedCount }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps } from 'vue'
  
  const props = defineProps({
    host: String
  })
  
  const failedCount = ref(0)
  const loading = ref(true)
  const error = ref(null)
  
  const fetchFailedSSH = async () => {
    loading.value = true
    error.value = null
    failedCount.value = 0
  
    try {
      const response = await fetch(
        `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=15m`
      )
  
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
  
      const text = await response.text() // Get raw NDJSON response
      const lines = text.trim().split("\n") // Split NDJSON by line
      failedCount.value = lines.length // Count the number of lines
  
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Fetch data on mount and when `host` changes
  onMounted(fetchFailedSSH)
  watch(() => props.host, fetchFailedSSH)
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
    font-size: 20px;
  }
  
  .count {
    font-size: 55px;
    font-weight: bold;
    color: rgba(255, 0, 0, 0.664);
    margin-bottom: -50px;
  }
  </style>
  