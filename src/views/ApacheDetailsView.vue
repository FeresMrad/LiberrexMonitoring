<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="containers">
          <h2 class="chart-title">Apache Details for {{ displayName }}</h2>
  
          
  
          <!-- Chart grid (other dashboard components) -->
          <div class="chart-grid">
            <div class="chart-item">
              <ApacheRpsChart :host="host" />
            </div>
            <div class="chart-item">
              <ApacheBpsChart :host="host" />
            </div>
            <!--<div class="chart-item"> 
              <ApacheDprChart :host="host" />
            </div>
            <div class="chart-item">
              <ApacheBprChart :host="host" />
            </div> -->
           
          </div>
          <div><ApacheTable :host="host"/></div>
  
          
        </div>
      </HiHello>
    </a-layout>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue'
  import { useRoute } from 'vue-router'
  import HiHello from "@/components/HiHello.vue"
//  import ApacheBprChart from "@/components/ApacheBprChart.vue"
  import ApacheBpsChart from "@/components/ApacheBpsChart.vue"
  import ApacheRpsChart from "@/components/ApacheRpsChart.vue"  
//  import ApacheDprChart from '@/components/ApacheDprChart.vue'
  import api from '@/services/api'
import ApacheTable from '@/components/ApacheTable.vue'
  
  // Define the host for usage within the component
  const route = useRoute()
  const host = ref(route.params.host)
  const customName = ref('')
  
  // Compute display name, showing custom name if available
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
  
  /* Top row styling: mix of uptime and gauge components */
  .top-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    width: 100%;
    margin-bottom: 20px;
  }
  
  /* Chart grid styling: 3 columns */
  .chart-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    width: 100%;
    margin-bottom: 20px;
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
  
  /* Empty cell styling */
  .chart-item.empty {
    background-color: transparent;
    border: none;
    box-shadow: none;
  }
  
  /* Table container styling */
  .table-container {
    width: 100%;
    margin-top: 10px;
  }
  </style>