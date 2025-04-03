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

        <!-- Main content: Left (2x2 grid) and Right (Table) -->
        <div class="main-content">
          <!-- Left side: 2x2 grid -->
          <div class="left-grid">
            <div class="chart-box">
              <FailedSshDoughnut :host="host" />
            </div>
            <div class="chart-box">
              <FailedSshDoughnut :host="host" />
            </div>
            <div class="chart-box">
              <FailedSshDoughnut :host="host" />
            </div>
            <div class="chart-box">
              <FailedSshDoughnut :host="host" />
            </div>
          </div>

          <!-- Right side: Table -->
          <div class="right-table">
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
  padding: 20px;
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
  
}
</style>
