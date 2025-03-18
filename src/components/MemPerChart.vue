<!-- MemPerChart.vue -->
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
          scales: { x: { ticks: { autoSkip: true, maxTicksLimit: 15 } } }
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
    datasets: [{
      label: 'Memory Usage (%)',
      data: [],
      fill: true,
      borderColor: 'rgba(75,192,192,1)',
      backgroundColor: 'rgba(75,192,192,0.2)'
    }]
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
   * Fetch Memory usage data based on the given time range.
   * Uses the passed host prop in the query.
   */
  const fetchData = async (timeRange = null) => {
    // Use the host prop instead of hardcoding "remote_machine"
    let query = `SELECT percent FROM memory WHERE host='${props.host}'`
    if (timeRange) query += ` AND time > now() - ${timeRange} ORDER BY time ASC`
  
    try {
      const response = await axios.get("http://82.165.230.7:8086/query", {
        params: { db: "metrics", q: query, u: "liberrex", p: "test" }
      })
  
      const data = response.data.results[0]?.series[0]?.values || []
      chartData.value = {
        labels: data.map(item => formatDate(item[0])),
        datasets: [{ ...chartData.value.datasets[0], data: data.map(item => item[1]), pointRadius: 0 }]
      }
      loaded.value = true
    } catch (error) {
      console.error(`Error fetching data (${timeRange || 'All Time'}):`, error)
    }
  }
  
  const handleNewData = (data) => {
    if (data.measurement === 'memory' && data.host === props.host) {
      chartData.value = {
        labels: [...chartData.value.labels, formatDate(data.time)],
        datasets: [{ ...chartData.value.datasets[0], data: [...chartData.value.datasets[0].data, data.fields.percent] }]
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
  