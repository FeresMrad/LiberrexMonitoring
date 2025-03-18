<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="containers">
        <h2 class="chart-title">Metrics for Host: {{ host }}</h2>

        <!-- Top row with 4 columns -->
        <div class="top-row">
          <!-- Uptime rectangle with dynamic uptime info -->
          <div class="top-item uptime" :class="uptimeInfo.isDown ? 'down' : 'up'">
            <template v-if="uptimeInfo.isDown">
              Last Activity: {{ uptimeInfo.displayText }}
            </template>
            <template v-else>
              Uptime: {{ uptimeInfo.displayText }}
            </template>
          </div>

          <!-- Gauge for CPU Usage -->
          <div class="top-item gauge">
            <a-progress :percent="cpuGauge" type="dashboard" :stroke-color="getGaugeColor(cpuGauge)"/>
            <div class="gauge-label">CPU</div>
          </div>

          <!-- Gauge for Memory Usage -->
          <div class="top-item gauge">
            <a-progress :percent="memoryGauge" type="dashboard" :stroke-color="getGaugeColor(memoryGauge)"/>
            <div class="gauge-label">Memory</div>
          </div>

          <!-- Gauge for Disk Usage -->
          <div class="top-item gauge">
            <a-progress :percent="diskGauge" type="dashboard" :stroke-color="getGaugeColor(diskGauge)"/>
            <div class="gauge-label">Disk</div>
          </div>
        </div>

        <!-- Chart grid: 3 columns; two rows with charts in first two columns, third column empty for future table -->
        <div class="chart-grid">
          <!-- Row 1: CPU and Memory charts, empty third column -->
          <div class="chart-item">
            <CpuPerChart :host="host" />
          </div>
          <div class="chart-item">
            <MemPerChart :host="host" />
          </div>
          <div class="chart-item empty"></div>

          <!-- Row 2: Network IO and Disk IO charts, empty third column -->
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
import HiHello from "@/components/HiHello.vue";
import CpuPerChart from "@/components/CpuPerChart.vue";
import MemPerChart from "@/components/MemPerChart.vue";
import NetworkioChart from "@/components/NetworkioChart.vue";
import DiskioChart from "@/components/DiskioChart.vue";
import { io } from "socket.io-client";

const route = useRoute();
const host = ref(route.params.host);

// Uptime reactive object
const uptimeInfo = ref({
  isDown: true,
  displayText: "Loading...",
  lastUptimeTimestamp: null,
});

// Gauge reactive variables
const cpuGauge = ref(0);
const memoryGauge = ref(0);
const diskGauge = ref(0);

// Format uptime in dd:hh:mm:ss
const formatUptime = (seconds) => {
  seconds = Math.floor(seconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d:${hours}h:${minutes}m:${secs}s`;
};

// Function to determine gauge color based on percentage value
const getGaugeColor = (value) => {
  if (value < 50) return "#52c41a";     // Green
  if (value < 75) return "#faad14";       // Orange
  return "#ff4d4f";                      // Red
};

// Fetch uptime and update uptimeInfo
let uptimeInterval = null;
const fetchUptime = async () => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "uptime_seconds" FROM "uptime" WHERE "host" = '${host.value}' ORDER BY time DESC LIMIT 1`,
        u: "liberrex",
        p: "test",
      },
    });
    const values = response.data.results[0]?.series[0]?.values || [];
    if (values.length > 0) {
      const lastUptimeTimestampStr = values[0][0]; // Latest uptime record timestamp
      const uptimeSeconds = values[0][1]; // Recorded uptime in seconds at that moment
      const lastUptimeTimestamp = new Date(lastUptimeTimestampStr);
      const currentTime = new Date();
      const diffSeconds = (currentTime.getTime() - lastUptimeTimestamp.getTime()) / 1000;

      if (diffSeconds > 60) {
        // If more than 60 seconds have passed since the last uptime record, mark as down and show last activity timestamp
        uptimeInfo.value = {
          isDown: true,
          displayText: lastUptimeTimestamp.toLocaleString("fr"),
          lastUptimeTimestamp,
        };
      } else {
        // Host is active; update uptime counter by adding elapsed time to stored uptime_seconds
        const currentUptime = uptimeSeconds + diffSeconds;
        uptimeInfo.value = {
          isDown: false,
          displayText: formatUptime(currentUptime),
          lastUptimeTimestamp,
        };
      }
    } else {
      uptimeInfo.value = { isDown: true, displayText: "Unknown", lastUptimeTimestamp: null };
    }
  } catch (error) {
    console.error("Error fetching uptime:", error);
    uptimeInfo.value = { isDown: true, displayText: "Error", lastUptimeTimestamp: null };
  }
};

// Fetch initial gauge values from DB
const fetchCpuGauge = async () => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "percent" FROM "cpu" WHERE "host" = '${host.value}' ORDER BY time DESC LIMIT 1`,
        u: "liberrex",
        p: "test",
      },
    });
    const values = response.data.results[0]?.series[0]?.values || [];
    if (values.length > 0) cpuGauge.value = values[0][1];
  } catch (error) {
    console.error("Error fetching CPU gauge:", error);
  }
};

const fetchMemoryGauge = async () => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "percent" FROM "memory" WHERE "host" = '${host.value}' ORDER BY time DESC LIMIT 1`,
        u: "liberrex",
        p: "test",
      },
    });
    const values = response.data.results[0]?.series[0]?.values || [];
    if (values.length > 0) memoryGauge.value = values[0][1];
  } catch (error) {
    console.error("Error fetching Memory gauge:", error);
  }
};

const fetchDiskGauge = async () => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "percent" FROM "disk" WHERE "host" = '${host.value}' ORDER BY time DESC LIMIT 1`,
        u: "liberrex",
        p: "test",
      },
    });
    const values = response.data.results[0]?.series[0]?.values || [];
    if (values.length > 0) diskGauge.value = values[0][1];
  } catch (error) {
    console.error("Error fetching Disk gauge:", error);
  }
};

const fetchGauges = async () => {
  await fetchCpuGauge();
  await fetchMemoryGauge();
  await fetchDiskGauge();
};

// WebSocket handling for gauge updates
const handleGaugeNewData = (data) => {
  if (data.host === host.value) {
    if (data.measurement === "cpu") {
      cpuGauge.value = data.fields.percent;
    } else if (data.measurement === "memory") {
      memoryGauge.value = data.fields.percent;
    } else if (data.measurement === "disk") {
      diskGauge.value = data.fields.percent;
    }
  }
};

const socket = io("http://82.165.230.7:5000");

onMounted(() => {
  fetchUptime();
  uptimeInterval = setInterval(fetchUptime, 1000);
  fetchGauges();
  socket.on("new_data", handleGaugeNewData);
});

onUnmounted(() => {
  if (uptimeInterval) clearInterval(uptimeInterval);
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
