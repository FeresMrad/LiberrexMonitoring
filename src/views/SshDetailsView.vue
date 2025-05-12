<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="containers">
        <h2 class="chart-title">SSH Details for {{ displayName }}</h2>

        <!-- Time range indicator - only shown when using default 60m filter -->
        <div v-if="isDefaultTimeRange" class="time-range-indicator">
          <ClockCircleOutlined /> 
          <span>Showing data from the last hour</span>
        </div>

        <!-- Date range pickers with reset button -->
        <div class="date-filter">
          <a-date-picker 
            v-model:value="startDate" 
            placeholder="Start Date" 
            showTime
            :disabledDate="disabledStartDate"
            style="margin-right: 8px;"
            @change="handleDateChange"
          />
          <a-date-picker 
            v-model:value="endDate" 
            placeholder="End Date" 
            showTime
            :disabledDate="disabledEndDate"
            style="margin-right: 8px;"
            @change="handleDateChange"
          />
          <a-button type="primary" @click="resetFilters" :loading="isLoading">
            <template #icon><UndoOutlined /></template>
            Reset
          </a-button>
        </div>

        <!-- Top row with 3 rectangles -->
        <div class="top-row">
          <ActiveSshCount :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
          <FailedSsh :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
          <UniqueFailedSsh :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
        </div>

        <!-- Main content: Left (2x2 grid) and Right (Table) -->
        <div class="main-content">
          <!-- Left side: 2x2 grid -->
          <div class="left-grid">
            <div class="chart-box">
              <SshDoughnutChart :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" connectionType="accepted" />
            </div>
            <div class="chart-box">
              <SshDoughnutChart :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" connectionType="failed" />
            </div>
            <div class ="chart-box">
              <ActiveSshSessions :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            </div>
            <div class ="chart-box">
              <FailedSshIpTable :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            </div>
          </div>

          <!-- Right side: Table -->
          <div class="right-table chart-box">
            <SshTable :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
          </div>
        </div>
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { UndoOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
import HiHello from "@/components/HiHello.vue"
import SshTable from '@/components/SshTable.vue'
import FailedSsh from '@/components/FailedSsh.vue'
import UniqueFailedSsh from '@/components/UniqueFailedSsh.vue'
import FailedSshIpTable from '@/components/FailedSshIpTable.vue'
import ActiveSshSessions from '@/components/ActiveSshSessions.vue'
import ActiveSshCount from '@/components/ActiveSshCount.vue'
import api from '@/services/api'
import SshDoughnutChart from '@/components/SshDoughnutChart.vue'

// Define the host for usage within the component
const route = useRoute()
const host = ref(route.params.host)
const customName = ref('')

// Computed property for display name
const displayName = computed(() => {
  return customName.value || host.value
})

// Fetch host details to get the custom name
const fetchHostDetails = async () => {
  try {
    const response = await api.getHosts()
    const hostDetails = response.data.find(h => h.name === host.value)
    if (hostDetails && hostDetails.customName) {
      customName.value = hostDetails.customName
    }
  } catch (error) {
    console.error("Error fetching host details:", error)
  }
}

// Date filter state
const startDate = ref(null)
const endDate = ref(null)
const isLoading = ref(false)
const refreshTrigger = ref(0) // Used to trigger refreshes in child components

// Computed property to check if using default time range (60m)
const isDefaultTimeRange = computed(() => {
  return !startDate.value && !endDate.value
})

// Computed property for timeRange parameter
const timeRange = computed(() => {
  if (isDefaultTimeRange.value) {
    return '60m' // Default to 60 minutes if no dates are selected
  }
  
  let range = {}
  
  if (startDate.value) {
    range.start = new Date(startDate.value).toISOString()
  }
  
  if (endDate.value) {
    range.end = new Date(endDate.value).toISOString()
  }
  
  return range
})

// Date validation functions
function disabledStartDate(current) {
  // Disable all future dates after today
  if (current && current > new Date()) {
    return true
  }

  // If an end date is selected, disable all dates after that
  if (endDate.value) {
    return current && current > endDate.value
  }

  return false
}

function disabledEndDate(current) {
  // Disable all future dates after today
  if (current && current > new Date()) {
    return true
  }
  
  // If a start date is selected, disable all dates before that
  if (startDate.value) {
    return current && current < startDate.value
  }

  return false
}

// Handler for date changes
function handleDateChange() {
  // Refresh data when dates change
  refreshData()
}

// Function to reset filters
function resetFilters() {
  isLoading.value = true
  
  // Reset date filters to null
  startDate.value = null
  endDate.value = null
  
  // Refresh data
  refreshTrigger.value++
  
  // Simulate loading for a short period
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// Function to refresh all components
function refreshData() {
  isLoading.value = true
  
  // Increment the refreshTrigger to notify all components to refresh
  refreshTrigger.value++
  
  // Simulate loading for a short period
  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

// Fetch host details when component mounts
onMounted(fetchHostDetails)
</script>

<style scoped>
.containers {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 15px;
}

/* Time range indicator styling */
.time-range-indicator {
  background-color: #f0f8ff;
  border-radius: 4px;
  padding: 8px 16px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #008fca;
  border: 1px solid #d9e8f3;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.time-range-indicator span {
  margin-left: 8px;
}

/* Date filter styling */
.date-filter {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* Top row styling: 3 rectangles */
.top-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

/* Main content layout: Left (2x2 Grid) | Right (Table) */
.main-content {
  display: flex;
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

/* Left side: 2x2 grid for charts */
.left-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, minmax(280px, auto));
  gap: 20px;
  flex: 1;
}

/* Chart box styling */
.chart-box {
  border: 1px solid #ccc;
  padding: 12px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

/* Right side: Table */
.right-table {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  overflow: auto;
}
</style>