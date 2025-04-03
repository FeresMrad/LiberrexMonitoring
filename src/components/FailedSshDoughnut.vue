<template>
    <div class="failed-ssh-doughnut">
      <h3>Failed SSH Logins by User </h3>
      <div v-if="loading">Loading...</div>
      <div v-else-if="error">Error: {{ error }}</div>
      <div v-else class="chart-container">
        <!-- Render the doughnut chart -->
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps, computed } from 'vue'
  import { Doughnut } from 'vue-chartjs'
  import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
  
  // Register necessary Chart.js components
  Chart.register(ArcElement, Tooltip, Legend)
  
  const props = defineProps({
    host: String
  })
  
  const loading = ref(true)
  const error = ref(null)
  const userCounts = ref({})
  
  // Function to fetch NDJSON logs and count failed SSH logins by user
  const fetchFailedSSHData = async () => {
    loading.value = true
    error.value = null
    userCounts.value = {}
    try {
      const response = await fetch(
        `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=15m`
      )
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      
      const text = await response.text()
      const lines = text.trim().split("\n")
      
      // Regular expression to extract the username.
      // It handles both:
      // "Failed password for invalid user student from ..." and "Failed password for student from ..."
      const userRegex = /Failed password for (?:invalid user )?(\S+)\s+from/i
      lines.forEach(line => {
        const match = userRegex.exec(line)
        if (match && match[1]) {
          userCounts.value[match[1]] = (userCounts.value[match[1]] || 0) + 1
        }
      })
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // Fetch data when the component mounts and when the host changes
  onMounted(fetchFailedSSHData)
  watch(() => props.host, fetchFailedSSHData)
  
  // Build chart data from the counted users
  const chartData = computed(() => {
    const labels = Object.keys(userCounts.value)
    const data = Object.values(userCounts.value)
    
    // Generate background colors dynamically for each slice
    const backgroundColor = labels.map((_, i) => `hsl(${(i * 360 / labels.length)}, 70%, 50%)`)
    const hoverBackgroundColor = labels.map((_, i) => `hsl(${(i * 360 / labels.length)}, 70%, 40%)`)
    
    return {
      labels,
      datasets: [
        {
          label: 'Failed SSH Logins by User',
          data,
          backgroundColor,
          hoverBackgroundColor
        }
      ]
    }
  })
  
  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  }
  </script>
  
  <style scoped>
  .failed-ssh-doughnut {
    text-align: center;
  }
  
  h3 {
    margin: 0;
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  /* Set a fixed height for the chart container */
  .chart-container {
    position: relative;
    height: 400px;
  }
  </style>
  