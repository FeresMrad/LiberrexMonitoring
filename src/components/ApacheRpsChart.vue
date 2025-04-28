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
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.parsed.y;
                  return `${label}: ${value !== null ? value.toFixed(2) : 'N/A'}`;
                }
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
    },
    ewmaAlpha: {
      type: Number,
      default: 0.3
    }
  })
  
  // Raw data storage for EWMA calculations
  const rawIntervalData = ref([]);
  const rawTimeLabels = ref([]);
  
  const chartData = shallowRef({
    labels: [],
    datasets: [
      {
        label: 'Weighted Average',
        data: [],
        fill: true,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.1
      },
      {
        label: 'Live',
        data: [],
        fill: true,
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      }
    ]
  })
  
  const loaded = ref(false)
  const pendingUpdates = ref({})  // Store pending updates by timestamp
  
  /**
   * Calculate Exponentially Weighted Moving Average
   * @param {Array} data - Array of data points
   * @param {Number} alpha - Smoothing factor between 0 and 1
   * @returns {Array} - Array of EWMA values
   */
  const calculateEWMA = (data, alpha) => {
    if (!data.length) return [];
    
    const result = [data[0]]; // Start with first value
    
    for (let i = 1; i < data.length; i++) {
      // Only calculate if we have a non-null value
      if (data[i] !== null && data[i] !== undefined) {
        const newValue = alpha * data[i] + (1 - alpha) * result[i-1];
        result.push(newValue);
      } else {
        // If null value, just carry forward previous EWMA
        result.push(result[i-1]);
      }
    }
    
    return result;
  };
  
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
      
      // Store raw data for EWMA calculation
      rawTimeLabels.value = response.data.map(item => formatDate(item.time));
      rawIntervalData.value = response.data.map(item => item.interval_req_per_sec);
      
      // Calculate EWMA from the interval data
      const ewmaData = calculateEWMA(
        response.data.map(item => item.interval_req_per_sec), 
        props.ewmaAlpha
      );
      
      chartData.value = {
        labels: rawTimeLabels.value,
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: ewmaData
          },
          {
            ...chartData.value.datasets[1],
            data: response.data.map(item => item.interval_req_per_sec)
          }
        ]
      }
      loaded.value = true;
    } catch (error) {
      console.error(`Error fetching data (${timeRange || 'All Time'}):`, error)
    }
  }
  
  // Main WebSocket handler for metric updates
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
      
      // Since we got interval data, process the update (we no longer need to wait for raw data)
      processUpdate(timeLabel);
    }
  };
  
  // Process the pending update for a timestamp
  const processUpdate = (timeLabel) => {
    // Get the pending update
    const pendingUpdate = pendingUpdates.value[timeLabel];
    
    // Skip if it doesn't exist or doesn't have interval data
    if (!pendingUpdate || pendingUpdate.intervalReqPerSec === null) return;
    
    // Get current state as mutable copies
    const currentLabels = [...chartData.value.labels];
    const currentDatasets = [...chartData.value.datasets];
    
    // Check if the timestamp already exists in our chart
    const timeIndex = currentLabels.indexOf(timeLabel);
    
    if (timeIndex === -1) {
      // New timestamp - append to data
      currentLabels.push(timeLabel);
      
      // Update the raw data arrays used for EWMA
      rawTimeLabels.value.push(timeLabel);
      rawIntervalData.value.push(pendingUpdate.intervalReqPerSec);
      
      // Recalculate EWMA with updated data
      const ewmaData = calculateEWMA(rawIntervalData.value, props.ewmaAlpha);
      
      // Update datasets
      currentDatasets[0] = {
        ...currentDatasets[0],
        data: ewmaData
      };
      
      currentDatasets[1] = {
        ...currentDatasets[1],
        data: [...currentDatasets[1].data, pendingUpdate.intervalReqPerSec]
      };
    } else {
      // Existing timestamp - update values at the specific index
      if (pendingUpdate.intervalProcessed) {
        // Update raw interval data for recalculation
        rawIntervalData.value[timeIndex] = pendingUpdate.intervalReqPerSec;
        
        // Recalculate EWMA
        const ewmaData = calculateEWMA(rawIntervalData.value, props.ewmaAlpha);
        
        // Update datasets
        currentDatasets[0] = {
          ...currentDatasets[0],
          data: ewmaData
        };
        
        // Update live data
        const newData1 = [...currentDatasets[1].data];
        newData1[timeIndex] = pendingUpdate.intervalReqPerSec;
        currentDatasets[1] = {
          ...currentDatasets[1],
          data: newData1
        };
      }
    }
    
    // Update the chart
    chartData.value = {
      labels: currentLabels,
      datasets: currentDatasets
    };
    
    // Clean up processed updates
    delete pendingUpdates.value[timeLabel];
  };
  
  // Keep chart limited to a reasonable number of points
  const limitChartSize = () => {
    // If we have more than 300 points, truncate to keep performance reasonable
    const maxPoints = 300;
    
    if (rawTimeLabels.value.length > maxPoints) {
      const excess = rawTimeLabels.value.length - maxPoints;
      rawTimeLabels.value = rawTimeLabels.value.slice(excess);
      rawIntervalData.value = rawIntervalData.value.slice(excess);
      
      // Update chart data too
      chartData.value = {
        labels: rawTimeLabels.value,
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: calculateEWMA(rawIntervalData.value, props.ewmaAlpha)
          },
          {
            ...chartData.value.datasets[1],
            data: rawIntervalData.value
          }
        ]
      };
    }
  };
  
  onMounted(() => {
    // Initial data fetch
    fetchData('1h')
    
    // Subscribe to WebSocket updates
    websocket.connect()
    websocket.subscribeToHost(props.host)
    websocket.addEventListener('metric_update', handleMetricUpdate)
    
    // Set up interval to limit chart size every 5 minutes
    const limiterInterval = setInterval(limitChartSize, 5 * 60 * 1000);
    
    // Clean up interval on component unmount
    onUnmounted(() => {
      clearInterval(limiterInterval);
    });
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