<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="containers">
        <h2 class="chart-title">Metrics for Host: {{ host }}</h2>

        <!-- Top row with 4 columns -->
        <div class="top-row">
          <!-- Uptime Component -->
          <UptimeInfo :host="host" />

          <!-- Gauge for CPU Usage -->
          <div class="top-item gauge">
            <a-progress :percent="cpuGauge" type="dashboard" :stroke-color="getGaugeColor(cpuGauge)" />
            <div class="gauge-label">CPU</div>
          </div>

          <!-- Gauge for Memory Usage -->
          <div class="top-item gauge">
            <a-progress :percent="memoryGauge" type="dashboard" :stroke-color="getGaugeColor(memoryGauge)" />
            <div class="gauge-label">Memory</div>
          </div>

          <!-- Gauge for Disk Usage -->
          <div class="top-item gauge">
            <a-progress :percent="diskGauge" type="dashboard" :stroke-color="getGaugeColor(diskGauge)" />
            <div class="gauge-label">Disk</div>
          </div>
        </div>

        <!-- Chart grid: 3 columns; two rows with charts in first two columns, third column empty for future table -->
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
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import axios from "axios";
import { io } from "socket.io-client";

import HiHello from "@/components/HiHello.vue";
import CpuPerChart from "@/components/CpuPerChart.vue";
import MemPerChart from "@/components/MemPerChart.vue";
import NetworkioChart from "@/components/NetworkioChart.vue";
import DiskioChart from "@/components/DiskioChart.vue";
import UptimeInfo from "@/components/UptimeInfo.vue";

const route = useRoute();
const host = ref(route.params.host);

const cpuGauge = ref(0);
const memoryGauge = ref(0);
const diskGauge = ref(0);

// Function to determine gauge color based on percentage value
const getGaugeColor = (value) => {
  if (value < 50) return "#52c41a";
  if (value < 75) return "#faad14";
  return "#ff4d4f";
};

// Fetch gauge values
const fetchGauge = async (measurement, gaugeVar) => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "percent" FROM "${measurement}" WHERE "host" = '${host.value}' ORDER BY time DESC LIMIT 1`,
        u: "liberrex",
        p: "test",
      },
    });
    const values = response.data.results[0]?.series[0]?.values || [];
    if (values.length > 0) gaugeVar.value = values[0][1];
  } catch (error) {
    console.error(`Error fetching ${measurement} gauge:`, error);
  }
};

const fetchGauges = async () => {
  await fetchGauge("cpu", cpuGauge);
  await fetchGauge("memory", memoryGauge);
  await fetchGauge("disk", diskGauge);
};

const socket = io("http://82.165.230.7:5000");

const handleGaugeNewData = (data) => {
  if (data.host === host.value) {
    if (data.measurement === "cpu") cpuGauge.value = data.fields.percent;
    if (data.measurement === "memory") memoryGauge.value = data.fields.percent;
    if (data.measurement === "disk") diskGauge.value = data.fields.percent;
  }
};

onMounted(() => {
  fetchGauges();
  socket.on("new_data", handleGaugeNewData);
});

onUnmounted(() => {
  socket.off("new_data", handleGaugeNewData);
});
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

/* Top row styling: 4 columns */
.top-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  width: 100%;
  margin-bottom: 20px;
}

.top-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  font-size: 25px;
  font-weight: bold;
  text-align: center;
}

.top-item.uptime.up {
  background-color: #52c41a; /* Green for active */  
  color: white;}

.top-item.uptime.down {  
  background-color: #ff4d4f; /* Red for down */  
  color: white;}

.top-item.gauge {  
  background-color: #f0f2f5;  
  color: #000;  
  border: 1px solid #d9d9d9;  
  display: flex;  flex-direction: column;  
  justify-content: center;  
  align-items: center;}

.gauge-label {  
  margin-top: 8px;  
  font-size: 20px;  
  font-weight: bold;}

/* Chart grid styling: 3 columns */
.chart-grid {  
  display: grid;  
  grid-template-columns: repeat(3, 1fr);  
  gap: 20px;  
  width: 100%;}

/* Chart item styling */
.chart-item {  
  border: 1px solid #ccc;  
  padding: 10px;  
  border-radius: 8px;  
  background-color: #f9f9f9;  
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);}

/* Empty cell styling */
.chart-item.empty {  
  background-color: transparent;  
  border: none;  
  box-shadow: none;}</style>
