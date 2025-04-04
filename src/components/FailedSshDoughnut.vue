<template>
    <div class="failed-ssh-doughnut">
      <h3>Failed Connections by User</h3>
      <div v-if="loading">Loading...</div>
      <div v-else-if="error">Error: {{ error }}</div>
      <div v-else class="chart-container">
  <Doughnut :data="chartData" :options="chartOptions" />
  <div class="custom-legend">
    <table>
      <tbody>
        <tr v-for="(count, user) in userCounts" :key="user">
          <td class="legend-color-cell">
            <span class="legend-color" :style="{ backgroundColor: userColors[user] }"></span>
          </td>
          <td class="legend-user">{{ user }}</td>
          <td class="legend-count">{{ count }}</td>
          <td class="legend-percent">
            {{ ((count / totalAttempts) * 100).toFixed(1) }}%
          </td>
        </tr>
      </tbody>
    </table>
  </div>
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
  const userColors = ref({})
  
  // Function to fetch NDJSON logs and count failed SSH logins by user
  const fetchFailedSSHData = async () => {
    loading.value = true
    error.value = null
    userCounts.value = {}
    userColors.value = {}
    try {
      const response = await fetch(
        `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd+Failed+password&start=15m`
      )
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`)
      
      const text = await response.text()
      const lines = text.trim().split("\n")
      
      // Regular expression to extract the username.
      // Handles both:
      // "Failed password for invalid user student from ..." and "Failed password for student from ..."
      const userRegex = /Failed password for (?:invalid user )?(\S+)\s+from/i
      lines.forEach(line => {
        const match = userRegex.exec(line)
        if (match && match[1]) {
          userCounts.value[match[1]] = (userCounts.value[match[1]] || 0) + 1
        }
      })
  
      // Generate a unique color for each user
      const users = Object.keys(userCounts.value)
      users.forEach((user, i) => {
        userColors.value[user] = `hsl(${(i * 360 / users.length)}, 70%, 50%)`
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
  
  // Compute total attempts
  const totalAttempts = computed(() => {
    return Object.values(userCounts.value).reduce((sum, count) => sum + count, 0)
  })
  
  // Build chart data from the counted users
  const chartData = computed(() => {
    const labels = Object.keys(userCounts.value)
    const data = Object.values(userCounts.value)
    
    return {
      labels,
      datasets: [
        {
          label: 'Failed SSH Logins by User',
          data,
          backgroundColor: labels.map(user => userColors.value[user])
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
        display: false // Hide default legend in favor of custom table
      },
      tooltip:{
        enabled: false
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
  
  /* Chart container */
  .chart-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  
}

.chart-container > canvas {
  flex-shrink: 0;
  width: 350px !important;
  height: 220px !important;
  margin-left: -80px;
  margin-right: -60px;
}

.custom-legend {
  flex-grow: 1;
  max-width: 200px; /* Prevent it from stretching too much */
  text-align: left;
}

.custom-legend table {
  width: 100%;
}

  
  .custom-legend table {
    border-collapse: collapse;
    width: 100%;
  }
  
  .custom-legend td {
    padding: 4px 8px;
    vertical-align: middle;
  }
  
  /* Remove table borders */
  .custom-legend table, .custom-legend td {
    border: none;
  }
  
  .legend-color-cell {
    width: 20px;
  }
  
  .legend-color {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }
  
  .legend-user {
    font-weight: bold;
    padding-left: 8px;
  }
  
  .legend-count,
  .legend-percent {
    text-align: right;
    padding-left: 8px;
  }
  </style>
  