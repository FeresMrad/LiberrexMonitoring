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
        <Bar v-if="loaded" :data="chartData" :options="chartOptions" />
        <div v-else class="loading-container">
          <a-spin tip="Loading status data..." />
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { shallowRef, ref, onMounted, watch, defineProps } from 'vue'
  import api from '@/services/api'
  import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, TimeScale, Title, Tooltip, Legend } from 'chart.js'
  import { Bar } from 'vue-chartjs'
  import 'chartjs-adapter-date-fns'
  
  ChartJS.register(BarElement, CategoryScale, LinearScale, TimeScale, Title, Tooltip, Legend)
  
  // Define a prop to accept host value
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    intervalMinutes: {
      type: Number,
      default: 1 // 1-minute intervals
    }
  })
  
  // Chart data state
  const chartData = shallowRef({
    labels: [],
    datasets: [
      {
        label: '2xx',
        data: [],
        backgroundColor: 'rgba(75, 192, 92, 0.6)',
        borderColor: 'rgba(75, 192, 92, 1)',
        borderWidth: 2
      },
      {
        label: '3xx',
        data: [],
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      },
      {
        label: '4xx',
        data: [],
        backgroundColor: 'rgba(255, 159, 64, 0.6)',
        borderColor: 'rgba(255, 159, 64, 1)',
        borderWidth: 2
      },
      {
        label: '5xx',
        data: [],
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2
      }
    ]
  })
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { 
      mode: 'index',
      intersect: false 
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'dd MMM, HH:mm'
          },
        },
        stacked: true,
      },
      y: {
        beginAtZero: true,
        stacked: true,
        ticks: {
            precision: 0,
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          title: function(context) {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleString('en-GB', { 
        minute: 'numeric', 
        hour: 'numeric', 
        day: 'numeric', 
        month: 'short' 
      });
          }
        }
      },
      title: {
        display: true,
        text: 'Status Codes Count',
        font: {
          size: 18,
          weight: 'bold'
        },
        padding: {
          bottom: 10
        }
      },
      legend: {
        position: 'top'
      }
    }
  }
  
  const loaded = ref(false)
  const logs = ref([])
  const isLoading = ref(false)
  
  // Function to parse Apache log message and extract status code
  const parseStatusCode = (logMsg) => {
    // Try to match the HTTP status code pattern (looking for " 200 " or similar)
    const regex = /"(?:GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) [^"]+ HTTP\/[\d.]+" (\d{3})/;
    const match = logMsg.match(regex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    // Fallback for timeout or invalid requests
    const timeoutRegex = /"(-)" (\d{3})/;
    const timeoutMatch = logMsg.match(timeoutRegex);
    
    if (timeoutMatch && timeoutMatch[2]) {
      return timeoutMatch[2];
    }
    
    return null;
  }
  
  // Function to group status codes into categories (2xx, 3xx, etc.)
  const getStatusCategory = (statusCode) => {
    if (!statusCode) return null;
    const firstDigit = statusCode.charAt(0);
    return `${firstDigit}xx`;
  }
  
  // Function to group logs by time intervals and count status codes
  const processLogsIntoTimeIntervals = (logs, intervalMinutes) => {
    if (!logs || logs.length === 0) return [];
    
    // Create time buckets for the specified interval (5 minutes by default)
    const intervals = {};
    const intervalMs = intervalMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    // Initialize status code counters for each category
    const statusCounts = {
      '2xx': 0,
      '3xx': 0,
      '4xx': 0,
      '5xx': 0
    };
    
    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => {
      return new Date(a._time).getTime() - new Date(b._time).getTime();
    });
    
    // Get the start and end times
    const firstLogTime = new Date(sortedLogs[0]._time).getTime();
    const lastLogTime = new Date(sortedLogs[sortedLogs.length - 1]._time).getTime();
    
    // Create all time buckets between first and last log (rounded to interval)
    const startTime = Math.floor(firstLogTime / intervalMs) * intervalMs;
    const endTime = Math.ceil(lastLogTime / intervalMs) * intervalMs;
    
    for (let time = startTime; time <= endTime; time += intervalMs) {
      intervals[time] = {
        time: new Date(time),
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0
      };
    }
    
    // Process each log entry
    sortedLogs.forEach(log => {
      const statusCode = parseStatusCode(log._msg || '');
      if (!statusCode) return;
      
      const category = getStatusCategory(statusCode);
      if (!category || !['2xx', '3xx', '4xx', '5xx'].includes(category)) return;
      
      // Increment the total count for this category
      statusCounts[category]++;
      
      // Find the appropriate time bucket
      const logTime = new Date(log._time).getTime();
      const bucketTime = Math.floor(logTime / intervalMs) * intervalMs;
      
      // Increment the count for this category in this time bucket
      if (intervals[bucketTime]) {
        intervals[bucketTime][category]++;
      }
    });
    
    // Convert intervals object to array and sort by time
    const timeIntervals = Object.values(intervals).sort((a, b) => a.time - b.time);
    
    return timeIntervals;
  }
  
  /**
   * Fetch Apache logs and process them into time intervals
   * Uses the passed host prop and time range
   */
  const fetchData = async (timeRange = null) => {
    try {
      isLoading.value = true;
      loaded.value = false;
      
      // Fetch logs from VictoriaLogs via the API
      const response = await api.getApacheLogs(props.host, timeRange);
      logs.value = response.data;
      
      // Process logs into time intervals
      const timeIntervals = processLogsIntoTimeIntervals(logs.value, props.intervalMinutes);
      
      // Update chart data
      const timestamps = timeIntervals.map(interval => interval.time);
      const success = timeIntervals.map(interval => interval['2xx']);
      const redirect = timeIntervals.map(interval => interval['3xx']);
      const clientError = timeIntervals.map(interval => interval['4xx']);
      const serverError = timeIntervals.map(interval => interval['5xx']);
      
      chartData.value = {
        labels: timestamps,
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: success,
            barPercentage: 1,
            categoryPercentage: 0.9
          },
          {
            ...chartData.value.datasets[1],
            data: redirect,
            barPercentage: 1,
            categoryPercentage: 0.9
          },
          {
            ...chartData.value.datasets[2],
            data: clientError,
            barPercentage: 1,
            categoryPercentage: 0.9
          },
          {
            ...chartData.value.datasets[3],
            data: serverError,
            barPercentage: 1,
            categoryPercentage: 0.9
          }
        ]
      };
      
      loaded.value = true;
    } catch (error) {
      console.error(`Error fetching Apache logs (${timeRange || 'All Time'}):`, error);
    } finally {
      isLoading.value = false;
    }
  }
  
  // Watch for changes in intervalMinutes prop
  watch(() => props.intervalMinutes, () => {
    if (logs.value.length > 0) {
      // Reprocess existing logs with new interval
      const timeIntervals = processLogsIntoTimeIntervals(logs.value, props.intervalMinutes);
      
      // Update chart data
      const timestamps = timeIntervals.map(interval => interval.time);
      const success = timeIntervals.map(interval => interval['2xx']);
      const redirect = timeIntervals.map(interval => interval['3xx']);
      const clientError = timeIntervals.map(interval => interval['4xx']);
      const serverError = timeIntervals.map(interval => interval['5xx']);
      
      chartData.value = {
        labels: timestamps,
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: success
          },
          {
            ...chartData.value.datasets[1],
            data: redirect
          },
          {
            ...chartData.value.datasets[2],
            data: clientError
          },
          {
            ...chartData.value.datasets[3],
            data: serverError
          }
        ]
      };
    }
  });
  
  onMounted(() => {
    // Initial data fetch - last hour by default
    fetchData('1h');
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
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  </style>