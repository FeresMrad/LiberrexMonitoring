<!-- ResourceUsageChart.vue -->
<template>
    <div>
      <!-- Buttons above the chart -->
      <div class="button-container">
        <button @click="fetchData()" class="time-button">All Time</button>
        <button @click="fetchData('30d')" class="time-button">Last Month</button>
        <button @click="fetchData('7d')" class="time-button">Last Week</button>
        <button @click="fetchData('1d')" class="time-button">Last Day</button>
        <button @click="fetchData('1h')" class="time-button">Last Hour</button>
      </div>
  
      <!-- Chart -->
      <div style="height: 300px;">
        <Line v-if="loaded" :data="chartData" :options="{ 
          maintainAspectRatio: false,
          interaction: { intersect: false },
          scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 15 } } },
          plugins: {
            title: {
              display: true,
              text: chartTitle,
              font: {
                size: 18,
                weight: 'bold'
              },
              padding: {
                bottom: 10
              }
            }
          }
        }" />
      </div>
    </div>
  </template>
  
  <script setup>
  import { shallowRef, ref, onMounted, onUnmounted, defineProps, computed } from 'vue'
  import api from '@/services/api'
  import websocket from '@/services/websocket'
  import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js'
  import { Line } from 'vue-chartjs'
  
  ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler)
  
  // Define props
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      required: true,
      validator: (value) => ['cpu', 'memory', 'disk'].includes(value)
    },
    title: {
      type: String,
      default: ''
    }
  })
  
  // Compute chart title based on resourceType if not provided
  const chartTitle = computed(() => {
    if (props.title) return props.title
    
    const titles = {
      cpu: 'CPU Usage (%)',
      memory: 'Memory Usage (%)',
      disk: 'Disk Usage (%)'
    }
    return titles[props.resourceType]
  })
  
  // Determine which API method to use based on resourceType
  const getApiMethod = (resourceType) => {
    const methods = {
      cpu: api.getCpuMetrics,
      memory: api.getMemoryMetrics, 
      disk: api.getDiskMetrics
    }
    return methods[resourceType]
  }
  
  const chartData = shallowRef({
    labels: [],
    datasets: [{
      label: 'Usage (%)',
      data: [],
      fill: true,
      borderColor: 'rgba(75,192,192,1)',
      backgroundColor: 'rgba(75,192,192,0.2)',
      borderWidth: 2,
    }]
  })
  
  const loaded = ref(false)
  
  const formatDate = (timestamp) => {
    let date;
    
    // If timestamp is a number (presumed to be nanoseconds from InfluxDB)
    if (!isNaN(timestamp) && timestamp.toString().length > 12) {
      date = new Date(parseInt(timestamp) / 1e6);
    } 
    // If timestamp is a string representing milliseconds (from WebSocket)
    else if (typeof timestamp === 'string' && !isNaN(Number(timestamp))) {
      date = new Date(Number(timestamp));
    } 
    // If timestamp is already a Date object or a date string
    else {
      date = new Date(timestamp);
    }
  
    return isNaN(date.getTime()) 
      ? "Invalid Date" 
      : date.toLocaleString('en-GB', { 
          minute: 'numeric', 
          hour: 'numeric', 
          day: 'numeric', 
          month: 'short' 
        });
  }
  
  /**
   * Fetch usage data based on the given time range.
   * Uses the passed host prop and resource type in the query.
   */
  const fetchData = async (timeRange = null) => {
    try {
      const apiMethod = getApiMethod(props.resourceType)
      const response = await apiMethod(props.host, timeRange)
      
      chartData.value = {
        labels: response.data.map(item => formatDate(item.time)),
        datasets: [{ 
          ...chartData.value.datasets[0], 
          data: response.data.map(item => item.percent), 
          pointRadius: 0 
        }]
      }
      loaded.value = true
    } catch (error) {
      console.error(`Error fetching ${props.resourceType} data (${timeRange || 'All Time'}):`, error)
    }
  }
  
  // Handler for WebSocket updates
  const handleMetricUpdate = (data) => {
    if (data.measurement === props.resourceType && data.host === props.host) {
      chartData.value = {
        labels: [...chartData.value.labels, formatDate(data.time)],
        datasets: [{ 
          ...chartData.value.datasets[0], 
          data: [...chartData.value.datasets[0].data, data.fields.percent] 
        }]
      }
    }
  }
  
  onMounted(() => {
    // Initial data fetch
    fetchData('1h')
    
    // Subscribe to WebSocket updates
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
  .button-container {
    display: flex;
    gap: 2px;
    margin-bottom: 10px;
    justify-content: center;
  }
  .time-button {
    padding: 3px 5px;
    font-size: 12px;
    background-color: #008fca;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .time-button:hover {
    background-color: #0078a8;
  }
  .time-button:focus {
    outline: none;
  }
  </style>