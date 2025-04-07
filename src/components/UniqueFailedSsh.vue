<template>
  <div class="failed-ssh">
    <h3>Failed Connections - Unique IP</h3>
    <p v-if="loading">Loading...</p>
    <p v-else-if="error">Error: {{ error }}</p>
    <p v-else class="count">{{ uniqueCount }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, defineProps } from 'vue'
import api from '@/services/api'

const props = defineProps({
  host: String,
  timeRange: {
    type: [String, Object],
    default: '60m'
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const uniqueCount = ref(0)
const loading = ref(true)
const error = ref(null)

const fetchUniqueFailedSSH = async () => {
  loading.value = true
  error.value = null
  uniqueCount.value = 0

  try {
    // Use the API method which now supports timeRange
    const response = await api.getSshFailedUniqueCount(props.host, props.timeRange)
    uniqueCount.value = response.data.count
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Fetch data on mount and when props change
onMounted(fetchUniqueFailedSSH)

// Watch for changes in timeRange or refreshTrigger
watch([() => props.timeRange, () => props.refreshTrigger], fetchUniqueFailedSSH)
</script>

<style scoped>
.failed-ssh {
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background-color: #ffe5e5;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h3 {
  margin: 0;
  font-size: 20px;
}

.count {
  font-size: 40px;
  font-weight: bold;
  color: rgba(255, 0, 0, 0.664);
  margin-top: 5px;
  margin-bottom: 0px;
}
</style>