<!-- ApacheRpsChart.vue with improved WebSocket handling for simultaneous events -->
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
              text: 'Requests Per Second',
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
  import { shallowRef, ref, onMounted, onUnmounted, defineProps } from 'vue'
  import api from '@/services/api'
  import websocket from '@/services/websocket'
  import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler } from 'chart.js'
  import { Line } from 'vue-chartjs'
  
  ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler)
  
  // Define a prop to accept host value
  const props = defineProps({
    host: {
      type: String,
      required: true
    }
  })
  
  const chartData = shallowRef({
    labels: [],
    datasets: [
      {
        label: 'Average',
        data: [],
        fill: false,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Live',
        data: [],
        fill: false,
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        pointRadius: 0,
        tension: 0.1
      }
    ]
  })
  
  const loaded = ref(false)
  const pendingUpdates = ref({})  // Store pending updates by timestamp
  
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
   * Fetch Apache RPS data based on the given time range.
   * Uses the passed host prop in the query.
   */
  const fetchData = async (timeRange = null) => {
    try {
      const response = await api.getApacheRpsMetrics(props.host, timeRange)
      
      chartData.value = {
        labels: response.data.map(item => formatDate(item.time)),
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: response.data.map(item => item.req_per_sec)
          },
          {
            ...chartData.value.datasets[1],
            data: response.data.map(item => item.interval_req_per_sec)
          }
        ]
      }
      loaded.value = true
    } catch (error) {
      console.error(`Error fetching data (${timeRange || 'All Time'}):`, error)
    }
  }
  
  // Main WebSocket handler for both measurement types
  const handleMetricUpdate = (data) => {
    // Only process events for this host
    if (data.host !== props.host) return;
    
    // Get formatted timestamp
    const timeLabel = formatDate(data.time);
    
    // Initialize pending update for this timestamp if it doesn't exist
    if (!pendingUpdates.value[timeLabel]) {
      pendingUpdates.value[timeLabel] = {
        time: timeLabel,
        rawProcessed: false,
        intervalProcessed: false,
        reqPerSec: null,
        intervalReqPerSec: null
      };
    }
    
    // Update the pending update based on measurement type
    if (data.measurement === 'apache_raw' && data.fields.req_per_sec !== undefined) {
      pendingUpdates.value[timeLabel].reqPerSec = data.fields.req_per_sec;
      pendingUpdates.value[timeLabel].rawProcessed = true;
    } 
    else if (data.measurement === 'apache_interval' && data.fields.interval_req_per_sec !== undefined) {
      pendingUpdates.value[timeLabel].intervalReqPerSec = data.fields.interval_req_per_sec;
      pendingUpdates.value[timeLabel].intervalProcessed = true;
    }
    
    // Process the update if we've received both measurements or after a short delay
    // to handle cases where only one measurement type comes in
    processUpdate(timeLabel);
  };
  
  // Process the pending update for a timestamp
  const processUpdate = (timeLabel) => {
    // Get current state
    const currentLabels = [...chartData.value.labels];
    const currentDatasets = [...chartData.value.datasets];
    const pendingUpdate = pendingUpdates.value[timeLabel];
    
    // Skip if we've already processed this update or it doesn't exist
    if (!pendingUpdate) return;
    
    // Check if the timestamp already exists in our chart
    const timeIndex = currentLabels.indexOf(timeLabel);
    
    if (timeIndex === -1) {
      // New timestamp - add to labels
      currentLabels.push(timeLabel);
      
      // Update datasets with the new values
      // For dataset 0 (Average - req_per_sec)
      currentDatasets[0] = {
        ...currentDatasets[0],
        data: [...currentDatasets[0].data, pendingUpdate.reqPerSec / 1024]
      };
      
      // For dataset 1 (Live - interval_req_per_sec)
      currentDatasets[1] = {
        ...currentDatasets[1],
        data: [...currentDatasets[1].data, pendingUpdate.intervalReqPerSec / 1024]
      };
      
      // Update the chart
      chartData.value = {
        labels: currentLabels,
        datasets: currentDatasets
      };
    } else {
      // Existing timestamp - update values at the specific index
      if (pendingUpdate.rawProcessed) {
        const newData0 = [...currentDatasets[0].data];
        newData0[timeIndex] = pendingUpdate.reqPerSec;
        currentDatasets[0] = {
          ...currentDatasets[0],
          data: newData0
        };
      }
      
      if (pendingUpdate.intervalProcessed) {
        const newData1 = [...currentDatasets[1].data];
        newData1[timeIndex] = pendingUpdate.intervalReqPerSec;
        currentDatasets[1] = {
          ...currentDatasets[1],
          data: newData1
        };
      }
      
      // Update the chart
      chartData.value = {
        labels: currentLabels,
        datasets: currentDatasets
      };
    }
    
    // Once we've processed both or waited long enough, clean up
    if (pendingUpdate.rawProcessed && pendingUpdate.intervalProcessed) {
      delete pendingUpdates.value[timeLabel];
    } else {
      // Set a timeout to process anyway after a short delay in case one measurement doesn't arrive
      setTimeout(() => {
        if (pendingUpdates.value[timeLabel]) {
          processUpdate(timeLabel);
          delete pendingUpdates.value[timeLabel];
        }
      }, 2000); // 2 second grace period
    }
  };
  
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
    
    // Clear any pending updates
    pendingUpdates.value = {}
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