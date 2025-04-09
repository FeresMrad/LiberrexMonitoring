<template>
    <div class="gauge-container">
      <a-progress :percent="gaugeValue" type="dashboard" :stroke-color="getGaugeColor(gaugeValue)" />
      <div class="gauge-label">{{ label }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, defineProps } from 'vue'
  import api from '@/services/api'
  import websocket from '@/services/websocket'
  
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    measurement: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    }
  })
  
  const gaugeValue = ref(0)
  
  // Determine gauge color based on value
  const getGaugeColor = (value) => {
    if (value < 50) return "#52c41a"
    if (value < 75) return "#faad14"
    return "#ff4d4f"
  }
  
  // Fetch the gauge value from the metrics API
  const fetchGauge = async () => {
    try {
      // Dynamically select the right API method based on measurement
      let fetchMethod;
      switch(props.measurement) {
        case 'cpu':
          fetchMethod = api.getCpuMetrics;
          break;
        case 'memory':
          fetchMethod = api.getMemoryMetrics;
          break;
        case 'disk':
          fetchMethod = api.getDiskMetrics;
          break;
        default:
          throw new Error(`Unsupported measurement: ${props.measurement}`);
      }
      
      const response = await fetchMethod(props.host);
      if (response.data && response.data.length > 0) {
        gaugeValue.value = response.data[0].percent;
      }
    } catch (error) {
      console.error(`Error fetching ${props.measurement} gauge:`, error)
    }
  }
  
  // Handler for WebSocket metric updates
  const handleMetricUpdate = (data) => {
    if (data.host === props.host && data.measurement === props.measurement) {
      gaugeValue.value = data.fields.percent;
    }
  }
  
  onMounted(() => {
    // Initial gauge fetch
    fetchGauge()
    
    // Connect and subscribe to WebSocket
    websocket.connect()
    websocket.subscribeToHost(props.host)
    websocket.addEventListener('metric_update', handleMetricUpdate)
  })
  
  onUnmounted(() => {
    // Cleanup WebSocket listeners and subscriptions
    websocket.removeEventListener('metric_update', handleMetricUpdate)
    websocket.unsubscribeFromHost(props.host)
  })
  </script>
  
  <style scoped>
  .gauge-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    border: 1px solid #d9d9d9;
    background-color: #f0f2f5;
    border-radius: 8px;
  }
  .gauge-label {
    margin-top: 8px;
    font-size: 20px;
    font-weight: bold;
  }
  </style>