<template>
    <div class="gauge-container">
      <a-progress :percent="gaugeValue" type="dashboard" :stroke-color="getGaugeColor(gaugeValue)" />
      <div class="gauge-label">{{ label }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, defineProps } from 'vue'
  import axios from 'axios'
  import { io } from 'socket.io-client'
  
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
  
  // Fetch the gauge value from InfluxDB
  const fetchGauge = async () => {
    try {
      const response = await axios.get("http://82.165.230.7:8086/query", {
        params: {
          db: "metrics",
          q: `SELECT "percent" FROM "${props.measurement}" WHERE "host" = '${props.host}' ORDER BY time DESC LIMIT 1`,
          u: "liberrex",
          p: "test",
        },
      })
      const values = response.data.results[0]?.series[0]?.values || []
      if (values.length > 0) {
        gaugeValue.value = values[0][1]
      }
    } catch (error) {
      console.error(`Error fetching ${props.measurement} gauge:`, error)
    }
  }
  
  // Set up socket.io to listen for new data
  const socket = io("http://82.165.230.7:5000")
  const handleNewData = (data) => {
    if (data.host === props.host && data.measurement === props.measurement) {
      gaugeValue.value = data.fields.percent
    }
  }
  
  onMounted(() => {
    fetchGauge()
    socket.on("new_data", handleNewData)
  })
  
  onUnmounted(() => {
    socket.off("new_data", handleNewData)
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
  