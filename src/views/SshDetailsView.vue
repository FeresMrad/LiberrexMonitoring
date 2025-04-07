<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="containers">
          <h2 class="chart-title">SSH Details for {{ host }}</h2>
  
          <!-- Date range pickers -->
          <div class="date-filter">
            <a-date-picker 
              v-model:value="startDate" 
              placeholder="Start Date" 
              showTime
              :disabledDate="disabledStartDate"
              style="margin-right: 8px;"
            />
            <a-date-picker 
              v-model:value="endDate" 
              placeholder="End Date" 
              showTime
              :disabledDate="disabledEndDate"
              style="margin-right: 8px;"
            />
            <a-button type="primary" @click="refreshData" :loading="isLoading">
              <template #icon><RedoOutlined /></template>
              Apply Filters
            </a-button>
          </div>
  
          <!-- Top row with 3 rectangles -->
          <div class="top-row">
            <FailedSsh :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            <FailedSsh :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
            <UniqueFailedSsh :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
          </div>
  
          <!-- Main content: Left (2x2 grid) and Right (Table) -->
          <div class="main-content">
            <!-- Left side: 2x2 grid -->
            <div class="left-grid">
              <div class="chart-box">
                <FailedSshDoughnut :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
              </div>
              <div class="chart-box">
                <FailedSshDoughnut :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
              </div>
              <div class ="chart-box">
                <FailedSshIpTable :host="host" :timeRange="timeRange" :refreshTrigger="refreshTrigger" />
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
  import { ref, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import { RedoOutlined } from '@ant-design/icons-vue'
  import HiHello from "@/components/HiHello.vue"
  import SshTable from '@/components/SshTable.vue'
  import FailedSsh from '@/components/FailedSsh.vue'
  import UniqueFailedSsh from '@/components/UniqueFailedSsh.vue'
  import FailedSshDoughnut from '@/components/FailedSshDoughnut.vue'
  import FailedSshIpTable from '@/components/FailedSshIpTable.vue'
  
  // Define the host for usage within the component
  const route = useRoute()
  const host = ref(route.params.host)
  
  // Date filter state
  const startDate = ref(null)
  const endDate = ref(null)
  const isLoading = ref(false)
  const refreshTrigger = ref(0) // Used to trigger refreshes in child components
  
  // Computed property for timeRange parameter
  const timeRange = computed(() => {
    if (!startDate.value && !endDate.value) {
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
    grid-template-rows: repeat(2, 1fr);
    gap: 20px;
    flex: 1;
  }
  
  /* Chart box styling */
  .chart-box {
    border: 1px solid #ccc;
    padding: 5px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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