<template>
    <div class="counter-component" :class="getComponentClass()">
      <h3>{{ title }}</h3>
      <p v-if="loading">Loading...</p>
      <p v-else-if="error">Error: {{ error }}</p>
      <p v-else class="count">{{ count }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps, computed } from 'vue'
  import api from '@/services/api'
  
  const props = defineProps({
    host: String,
    counterType: {
      type: String,
      required: true,
      validator: (value) => ['failed', 'uniqueFailed', 'active'].includes(value)
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
  
  const count = ref(0)
  const loading = ref(true)
  const error = ref(null)
  
  // Component title based on counterType
  const title = computed(() => {
    const titles = {
      'failed': 'Failed Connections',
      'uniqueFailed': 'Failed Connections - Unique IP',
      'active': 'Active Connections'
    };
    return titles[props.counterType];
  });
  
  const fetchData = async () => {
    loading.value = true
    error.value = null
    count.value = 0
  
    try {
      let response;
      
      // Use different API methods based on counterType
      switch(props.counterType) {
        case 'failed':
          response = await api.getSshFailedCount(props.host, props.timeRange);
          count.value = response.data.count;
          break;
        case 'uniqueFailed':
          response = await api.getSshFailedUniqueCount(props.host, props.timeRange);
          count.value = response.data.count;
          break;
        case 'active':
          response = await api.getSshSessions(props.host);
          count.value = response.data.sessions ? response.data.sessions.length : 0;
          break;
      }
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Return appropriate CSS class based on counterType
  const getComponentClass = () => {
    return props.counterType === 'active' ? 'active-counter' : 'failed-counter';
  }
  
  // Fetch data on mount and when props change
  onMounted(fetchData)
  
  // Watch for changes in timeRange or refreshTrigger
  watch([() => props.timeRange, () => props.refreshTrigger], fetchData)
  </script>
  
  <style scoped>
  .counter-component {
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .failed-counter {
    background-color: #ffe5e5;
  }
  
  .active-counter {
    background-color: #e6f7ff;
  }
  
  h3 {
    margin: 0;
    font-size: 20px;
  }
  
  .count {
    font-size: 40px;
    font-weight: bold;
    margin-top: 5px;
    margin-bottom: 1px;
  }
  
  .failed-counter .count {
    color: rgba(255, 0, 0, 0.664);
  }
  
  .active-counter .count {
    color: #1890ff;
  }
  </style>