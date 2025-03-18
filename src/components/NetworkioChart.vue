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
      text: 'Network I/O (KB)',  // Title text
      font: {
        size: 18,  // Font size of the title
        weight: 'bold'  // Font weight of the title
      },
      padding: {
        bottom: 10  // Space between the title and the chart
      }
    }
  }
}" />

      </div>
    </div>
  </template>
  
  <script setup>
  import { shallowRef, ref, onMounted, onUnmounted, defineProps } from 'vue'
  import axios from 'axios'
  import { io } from 'socket.io-client'
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
        label: 'Sent',
        data: [],
        fill: true,
        borderColor: 'rgba(75,192,192,1)',
        backgroundColor: 'rgba(75,192,192,0.2)',
        pointRadius: 0
      },
      {
        label: 'Received',
        data: [],
        fill: true,
        borderColor: 'rgba(255,99,132,1)',
        backgroundColor: 'rgba(255,99,132,0.2)',
        pointRadius: 0
      }
    ]
  })
  
  const loaded = ref(false)
  const socket = io('http://82.165.230.7:5000')
  
  const formatDate = (timestamp) => {
    let date = !isNaN(timestamp) && timestamp.toString().length > 12 
      ? new Date(parseInt(timestamp) / 1e6)
      : new Date(timestamp)
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleString('fr', { minute: 'numeric', hour: 'numeric', day: 'numeric', month: 'short' })
  }
  
  /**
   * Fetch Network data based on the given time range.
   * Uses the passed host prop in the query.
   */
  const fetchData = async (timeRange = null) => {
    // Use the host prop instead of hardcoding "remote_machine"
    let query = `SELECT sent_per_second, received_per_second FROM network WHERE host='${props.host}'`
    if (timeRange) query += ` AND time > now() - ${timeRange} ORDER BY time ASC`
  
    try {
      const response = await axios.get("http://82.165.230.7:8086/query", {
        params: { db: "metrics", q: query, u: "liberrex", p: "test" }
      })
  
      const data = response.data.results[0]?.series[0]?.values || []
      chartData.value = {
        labels: data.map(item => formatDate(item[0])),
        datasets: [
          {
            ...chartData.value.datasets[0],
            data: data.map(item => item[1] /1024)  // 'sent' data
          },
          {
            ...chartData.value.datasets[1],
            data: data.map(item => item[2] / 1024)  // 'received' data
          }
        ]
      }
      loaded.value = true
    } catch (error) {
      console.error(`Error fetching data (${timeRange || 'All Time'}):`, error)
    }
  }
  
  const handleNewData = (data) => {
  if (data.measurement === 'network' && data.host === props.host) {
    // Convert bytes to KB by dividing by 1024
    const sentInKB = data.fields.sent_per_second / 1024;
    const receivedInKB = data.fields.received_per_second / 1024;
    
    chartData.value = {
      labels: [...chartData.value.labels, formatDate(data.time)],
      datasets: [
        { 
          ...chartData.value.datasets[0], 
          data: [...chartData.value.datasets[0].data, sentInKB] 
        },
        { 
          ...chartData.value.datasets[1], 
          data: [...chartData.value.datasets[1].data, receivedInKB] 
        }
      ]
    }
  }
}

  
  onMounted(() => {
    fetchData('1h')
    socket.on('new_data', handleNewData)
  })
  
  onUnmounted(() => {
    socket.off('new_data', handleNewData)
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
  