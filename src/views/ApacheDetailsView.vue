<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="containers">
          <h2 class="chart-title">Apache Details for {{ displayName }}</h2>
  
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
          
          <!-- First row of charts -->
          <div class="chart-grid">
            <div class="chart-item">
              <ApacheMetricChart :host="host" metricType="rps" />
            </div>
            <div class="chart-item">
              <ApacheMetricChart :host="host" metricType="bps" />
            </div>
            <div class="chart-item">
              <ApacheTopUrls :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            </div>
          </div>
  
          <!-- Second row with status chart and IP addresses -->
          <div class="chart-grid">
            <div class="chart-item wide-2">
              <ApacheStatusChart :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            </div>
            <div class="chart-item">
              <ApacheTopIPs :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            </div>
          </div>
  
          <!-- Table container -->
          <div class="table-container">
            <ApacheTable :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
          </div>
        </div>
      </HiHello>
    </a-layout>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { UndoOutlined, ClockCircleOutlined } from '@ant-design/icons-vue'
  import HiHello from "@/components/HiHello.vue"
  import ApacheTopUrls from "@/components/ApacheTopUrls.vue"
  import ApacheStatusChart from "@/components/ApacheStatusChart.vue"
  import ApacheTopIPs from "@/components/ApacheTopIPs.vue"
  import ApacheTable from '@/components/ApacheTable.vue'
  import api from '@/services/api'
  import ApacheMetricChart from '@/components/ApacheMetricChart.vue'
  
  // Define the host for usage within the component
  const route = useRoute()
  const host = ref(route.params.host)
  const customName = ref('')
  
  // Date filter state
  const startDate = ref(null)
  const endDate = ref(null)
  const isLoading = ref(false)
  const refreshTrigger = ref(0) // Used to trigger refreshes in child components
  
  // Computed property to check if using default time range (60m)
  const isDefaultTimeRange = computed(() => {
    return !startDate.value && !endDate.value
  })
  
  // Computed property for display name
  const displayName = computed(() => {
    return customName.value || host.value
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
  
  /* Chart grid styling: 3 columns in first row, 2+1 in second row */
  .chart-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    width: 100%;
    margin-bottom: 20px;
  }
  
  /* Wide chart that spans multiple columns */
  .chart-item.wide-2 {
    grid-column: span 2;
  }
  
  /* Chart item styling */
  .chart-item {
    border: 1px solid #ccc;
    padding: 10px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden; /* Prevent content from breaking out */
    min-width: 0; /* Allows flex items to shrink below content size */
  }
  
  /* Table container styling */
  .table-container {
    width: 100%;
    margin-top: 10px;
  }
  
  /* Make the grid responsive for smaller screens */
  @media (max-width: 1200px) {
    .chart-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    
    .chart-item.wide-2 {
      grid-column: span 2;
    }
  }
  
  @media (max-width: 768px) {
    .chart-grid {
      grid-template-columns: 1fr;
    }
    
    .chart-item.wide-2 {
      grid-column: span 1;
    }
  }
  </style>