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
            <!-- Sort the users by their failed login count -->
            <tr v-for="(count, user) in sortedUserCounts" :key="user">
              <td class="legend-color-cell">
                <span class="legend-color" :style="{ backgroundColor: getUserColor(user) }"></span>
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
import { ref, onMounted, defineProps, computed, watch } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js'
import api from '@/services/api'

// Register necessary Chart.js components
Chart.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  host: String,
  timeRange: {
    type: [String, Object],
    default: '60m'
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const loading = ref(true)
const error = ref(null)
const userCounts = ref({})
const totalAttempts = ref(0)
const userColorCache = ref({}) // Cache for generated colors

// Function to generate a color for a user based on their name
const getUserColor = (username) => {
  // If we've already generated a color for this user, return it from cache
  if (userColorCache.value[username]) {
    return userColorCache.value[username]
  }
  
  // Otherwise, create a new color based on the username
  // Simple hash function to get a number from a string
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // Convert the hash to a hue (0-360)
  const hue = hash % 360
  const color = `hsl(${hue}, 90%, 65%)`
  
  // Save the color to cache for future use
  userColorCache.value[username] = color
  
  return color
}

// Function to fetch failed SSH login data by user
const fetchFailedSSHData = async () => {
  loading.value = true
  error.value = null
  userCounts.value = {}
  
  try {
    // Modified API call - now we expect only counts, not colors
    const response = await api.getSshFailedUsers(props.host, props.timeRange)
    
    // Update user counts from API response
    userCounts.value = response.data.counts || {}
    
    // Update total attempts
    totalAttempts.value = response.data.total || 0
    
    // For each user, ensure they have a color
    Object.keys(userCounts.value).forEach(user => {
      getUserColor(user)
    })
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Fetch data when the component mounts and when props change
onMounted(fetchFailedSSHData)

// Watch for changes in timeRange or refreshTrigger
watch([() => props.timeRange, () => props.refreshTrigger], fetchFailedSSHData)

// Sort users by the number of attempts
const sortedUserCounts = computed(() => {
  return Object.entries(userCounts.value)
    .sort(([, countA], [, countB]) => countB - countA) // Sort by count descending
    .reduce((acc, [user, count]) => {
      acc[user] = count
      return acc
    }, {})
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
        backgroundColor: labels.map(user => getUserColor(user))
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
      display: false 
    },
    tooltip: {
      enabled: false
    }
  }
}
</script>

<style scoped>
.failed-ssh-doughnut {
  text-align: center;
  margin-top: 8px;
}

h3 {
  margin: 0;
  font-size: 18px;
  margin-bottom: 20px;
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
  margin-left: -90px;
  margin-right: -80px;
}

.custom-legend {
  flex-grow: 1;
  max-width: 250px; /* Prevent it from stretching too much */
  text-align: left;
  overflow-y: auto;
  max-height: 250px; /* Adjust based on design */
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