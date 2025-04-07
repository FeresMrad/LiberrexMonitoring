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
import api from '@/services/api';

const props = defineProps({
  host: String, // Receive the host as a prop
});

// Uptime reactive object
const uptimeInfo = ref({
  isDown: true,
  displayText: "Loading...",
  lastUptimeTimestamp: null,
});

let uptimeInterval = null;
const localUptimeCounter = ref(null);

// Fetch uptime and update uptimeInfo
const fetchUptime = async () => {
  try {
    const response = await api.getUptime(props.host);
    
    // Update the uptime info with the API response
    uptimeInfo.value = response.data;
    
    // If the host is up, start a local counter
    if (!uptimeInfo.value.isDown) {
      startLocalCounter(uptimeInfo.value.displayText);
    } else {
      stopLocalCounter();
    }
  } catch (error) {
    console.error("Error fetching uptime:", error);
    uptimeInfo.value = { isDown: true, displayText: "Error", lastUptimeTimestamp: null };
    stopLocalCounter();
  }
};

// Start a local counter that updates the uptime display
const startLocalCounter = (initialUptime) => {
  // Parse the initial uptime from format "Xd Yh Zm Ns"
  const matches = initialUptime.match(/(\d+)d\s+(\d+)h\s+(\d+)m\s+(\d+)s/);
  if (!matches) return;
  
  const days = parseInt(matches[1]);
  const hours = parseInt(matches[2]);
  const minutes = parseInt(matches[3]);
  const seconds = parseInt(matches[4]);
  
  // Calculate total seconds
  let totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  
  // Clear any existing interval
  stopLocalCounter();
  
  // Create a new interval that increments the counter every second
  localUptimeCounter.value = setInterval(() => {
    totalSeconds++;
    
    // Update the display
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    uptimeInfo.value.displayText = `${d}d ${h}h ${m}m ${s}s`;
  }, 1000);
};

const stopLocalCounter = () => {
  if (localUptimeCounter.value) {
    clearInterval(localUptimeCounter.value);
    localUptimeCounter.value = null;
  }
};

// Handler for host changes
const handleHostChange = () => {
  stopLocalCounter();
  fetchUptime();
};

// Watch for host changes and refetch uptime
watch(() => props.host, handleHostChange, { immediate: true });

onMounted(() => {
  // Initial fetch and then reduced polling frequency (every 30 seconds)
  // This is just to check if the system is still up
  uptimeInterval = setInterval(fetchUptime, 30000);
});

onUnmounted(() => {
  if (uptimeInterval) clearInterval(uptimeInterval);
  stopLocalCounter();
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