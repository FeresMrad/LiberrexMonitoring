<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="containers">
          <h2 class="chart-title">{{ host }}</h2>
  
          <!-- Top row with 3 rectangles -->
          <div class="top-row">
            <FailedSsh :host="host" />
            <FailedSsh :host="host" />
            <UniqueFailedSsh :host="host" />
          </div>
  
          <!-- Main content: split into two -->
          <div class="main-content">
            <!-- Left split (further divided into two) -->
            <div class="left-split">
              <div class="left-top">
                <!-- Add content to the top part of the left split -->
                <FailedSshDoughnut :host="host" />
              </div>
              <div class="left-bottom">
                <!-- Add content to the bottom part of the left split -->
                <FailedSshDoughnut :host="host" />
              </div>
            </div>
  
            <!-- Right split: Table -->
            <div class="right-split">
              <SshTable :host="host" />
            </div>
          </div>
        </div>
      </HiHello>
    </a-layout>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRoute } from 'vue-router'
  import HiHello from "@/components/HiHello.vue"
  import SshTable from '@/components/SshTable.vue'
  import FailedSsh from '@/components/FailedSsh.vue'
  import UniqueFailedSsh from '@/components/UniqueFailedSsh.vue'
  import FailedSshDoughnut from '@/components/FailedSshDoughnut.vue'
  
  // Define the host for usage within the component
  const route = useRoute()
  const host = ref(route.params.host)
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
  
  /* Top row styling: 3 rectangles */
  .top-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}
  
  /* Rectangle styles */
  .rectangle {
    flex: 1;
    border: 1px solid #ccc;
    padding: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Main content layout: split into left and right */
  .main-content {
    display: flex;
    gap: 20px;
    width: 100%;
    margin-bottom: 20px;
  }
  
  /* Left split further divided into two parts */
  .left-split {
    display: flex;
    flex-direction: row;
    gap: 20px;
    flex: 2;
  }
  
  /* Left split top and bottom styling */
  .left-top, .left-bottom {
    flex: 1;
    border: 1px solid #ccc;
    padding: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Right split: table */
  .right-split {
    flex: 1;
    border: 1px solid #ccc;
    padding: 20px;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Table container styling */
  .table-container {
    width: 100%;
    margin-top: 20px;
  }

  .left-split, .right-split {
  flex: 1; /* Makes both splits equal in width */
}

  </style>
  