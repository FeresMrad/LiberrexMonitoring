<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="containers">
        <h2 class="chart-title">Metrics for Host: {{ host }}</h2>

        <!-- Top row: Uptime component and three GaugeChart components -->
        <div class="top-row">
          <!-- Uptime Component -->
          <UptimeInfo :host="host" />

          <!-- Reusable Gauge Components -->
          <GaugeChart :host="host" measurement="cpu" label="CPU" />
          <GaugeChart :host="host" measurement="memory" label="Memory" />
          <GaugeChart :host="host" measurement="disk" label="Disk" />
        </div>

        <!-- Chart grid (other dashboard components) -->
        <div class="chart-grid">
          <div class="chart-item">
            <CpuPerChart :host="host" />
          </div>
          <div class="chart-item">
            <MemPerChart :host="host" />
          </div>
          <div class="chart-item empty"></div>

          <div class="chart-item">
            <NetworkioChart :host="host" />
          </div>
          <div class="chart-item">
            <DiskioChart :host="host" />
          </div>
          <div class="chart-item empty"></div>
        </div>
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import HiHello from "@/components/HiHello.vue"
import UptimeInfo from "@/components/UptimeInfo.vue"
import CpuPerChart from "@/components/CpuPerChart.vue"
import MemPerChart from "@/components/MemPerChart.vue"
import NetworkioChart from "@/components/NetworkioChart.vue"
import DiskioChart from "@/components/DiskioChart.vue"
import GaugeChart from "@/components/GaugeChart.vue"
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
}

/* Chart item styling */
.chart-item {
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 8px;
  background-color: #f9f9f9;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Empty cell styling */
.chart-item.empty {
  background-color: transparent;
  border: none;
  box-shadow: none;
}
</style>
