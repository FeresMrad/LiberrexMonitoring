<template>
  <div class="top-item uptime" :class="uptimeInfo.isDown ? 'down' : 'up'">
    <template v-if="uptimeInfo.isDown">
      Last Activity: {{ uptimeInfo.displayText }}
    </template>
    <template v-else>
      Uptime: {{ uptimeInfo.displayText }}
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from "vue";
import axios from "axios";

const props = defineProps({
  host: String, // Receive the host as a prop
});

// Uptime reactive object
const uptimeInfo = ref({
  isDown: true,
  displayText: "Loading...",
  lastUptimeTimestamp: null,
});

// Format uptime in dd:hh:mm:ss
const formatUptime = (seconds) => {
  seconds = Math.floor(seconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

let uptimeInterval = null;

// Fetch uptime and update uptimeInfo
const fetchUptime = async () => {
  try {
    const response = await axios.get("http://82.165.230.7:8086/query", {
      params: {
        db: "metrics",
        q: `SELECT "uptime_seconds" FROM "uptime" WHERE "host" = '${props.host}' ORDER BY time DESC LIMIT 1`,
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
        uptimeInfo.value = {
          isDown: true,
          displayText: lastUptimeTimestamp.toLocaleString("en-GB"),
          lastUptimeTimestamp,
        };
      } else {
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

// Watch for host changes and refetch uptime
watch(() => props.host, fetchUptime, { immediate: true });

onMounted(() => {
  uptimeInterval = setInterval(fetchUptime, 1000);
});

onUnmounted(() => {
  if (uptimeInterval) clearInterval(uptimeInterval);
});
</script>

<style scoped>
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
</style>
