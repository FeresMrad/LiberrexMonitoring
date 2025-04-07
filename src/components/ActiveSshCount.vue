<template>
    <div class="active-count">
      <h3>Active Connections</h3>
      <p v-if="loading">Loading...</p>
      <p v-else-if="error">Error: {{ error }}</p>
      <p v-else class="count">{{ sessionCount }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps } from 'vue'
  import api from '@/services/api'
  
  const props = defineProps({
    host: String,
    timeRange: {
      type: [String, Object],
      default: '60m'
    },
    refreshTrigger: {
      type: Number,
      default: 0
    }
  })
  
  const sessionCount = ref(0)
  const loading = ref(true)
  const error = ref(null)
  
  const fetchActiveSessions = async () => {
    loading.value = true
    error.value = null
    sessionCount.value = 0
  
    try {
      const response = await api.getSshSessions(props.host)
      sessionCount.value = response.data.sessions ? response.data.sessions.length : 0
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Fetch data on mount and when props change
  onMounted(fetchActiveSessions)
  
  // Watch for changes in timeRange or refreshTrigger
  watch([() => props.timeRange, () => props.refreshTrigger], fetchActiveSessions)
  </script>
  
  <style scoped>
  .active-count {
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #e6f7ff;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin: 0;
    font-size: 20px;
  }
  
  .count {
    font-size: 40px;
    font-weight: bold;
    color: #1890ff;
    margin-top: 5px;
    margin-bottom: -50px;
  }
  </style>