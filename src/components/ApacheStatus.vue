<template>
    <div class="apache-status-container">
      <h3 class="status-title">Apache Server Status</h3>
      
      <div v-if="loading" class="loading-indicator">
        <p>Loading server status...</p>
      </div>
      
      <div v-else-if="error" class="error-message">
        <p>{{ error }}</p>
      </div>
      
      <div v-else-if="!apacheStatus.is_responsive" class="not-responsive">
        <p class="status-indicator offline">
          <span class="status-icon">⚠️</span>
          Apache Server is not responsive
        </p>
      </div>
      
      <div v-else class="status-grid">
        <div class="status-item">
          <span class="status-label">Status</span>
          <span class="status-value">
            <span class="status-indicator online">
              <span class="status-icon">✓</span>
              Running
            </span>
          </span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Uptime</span>
          <span class="status-value">{{ formatUptime(apacheStatus.uptime_seconds) }}</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Workers</span>
          <span class="status-value">{{ apacheStatus.busy_workers }} busy / {{ apacheStatus.idle_workers }} idle</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Total Requests</span>
          <span class="status-value">{{ formatNumber(apacheStatus.total_accesses) }}</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Total Traffic</span>
          <span class="status-value">{{ formatBytes(apacheStatus.total_kbytes * 1024) }}</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Avg. Request Size</span>
          <span class="status-value">{{ formatBytes(apacheStatus.bytes_per_req) }}</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Bandwidth</span>
          <span class="status-value">{{ formatBytes(apacheStatus.bytes_per_sec) }}/sec</span>
        </div>
        
        <div class="status-item">
          <span class="status-label">Avg. Request Time</span>
          <span class="status-value">{{ formatDuration(apacheStatus.duration_per_req) }}</span>
        </div>
      </div>
      
      <div class="last-updated">
        Last updated: {{ lastUpdated }}
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onUnmounted, defineProps } from 'vue'
  import api from '@/services/api'
  import websocket from '@/services/websocket'
  
  // Props definition
  const props = defineProps({
    host: {
      type: String,
      required: true
    }
  })
  
  // State variables
  const apacheStatus = ref({
    is_responsive: false,
    busy_workers: 0,
    idle_workers: 0,
    uptime_seconds: 0,
    total_accesses: 0,
    total_kbytes: 0,
    bytes_per_req: 0,
    bytes_per_sec: 0,
    duration_per_req: 0
  })
  const loading = ref(true)
  const error = ref(null)
  const lastUpdated = ref('Never')
  const refreshInterval = ref(null)
  
  // Fetch Apache status from the API
  const fetchApacheStatus = async () => {
    try {
      loading.value = true
      error.value = null
      
      const response = await api.getApacheStatus(props.host)
      apacheStatus.value = response.data
      
      // Update last updated time
      lastUpdated.value = new Date().toLocaleString()
      
    } catch (err) {
      console.error('Error fetching Apache status:', err)
      error.value = 'Failed to load Apache status. Apache might not be configured on this host.'
    } finally {
      loading.value = false
    }
  }
  
  // Format uptime in a human-readable way
  const formatUptime = (seconds) => {
    if (!seconds) return 'Unknown'
    
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    let result = ''
    if (days > 0) result += `${days}d `
    if (hours > 0 || days > 0) result += `${hours}h `
    result += `${minutes}m`
    
    return result
  }
  
  // Format bytes to human-readable format
  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return '0 B'
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // Format a number with thousand separators
  const formatNumber = (num) => {
    if (!num && num !== 0) return 'Unknown'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  
  // Format duration in milliseconds
  const formatDuration = (duration) => {
    if (!duration && duration !== 0) return 'Unknown'
    return `${duration.toFixed(2)} ms`
  }
  
  // Handle WebSocket updates for Apache metrics
  const handleMetricUpdate = (data) => {
    if (data.measurement === 'apache_raw' && data.host === props.host) {
      // Update the relevant fields from the raw metrics
      if (data.fields) {
        Object.keys(data.fields).forEach(key => {
          if (key in apacheStatus.value) {
            apacheStatus.value[key] = data.fields[key]
          }
        })
      }
      
      // Update last updated time
      lastUpdated.value = new Date().toLocaleString()
    } else if (data.measurement === 'apache_health' && data.host === props.host) {
      // Update Apache responsiveness status
      if ('is_responsive' in data.fields) {
        apacheStatus.value.is_responsive = data.fields.is_responsive === 1
        
        // Update last updated time
        lastUpdated.value = new Date().toLocaleString()
      }
    }
  }
  
  // Lifecycle hooks
  onMounted(() => {
    // Fetch initial data
    fetchApacheStatus()
    
    // Set up polling every 30 seconds as a fallback if WebSocket doesn't work
    refreshInterval.value = setInterval(fetchApacheStatus, 30000)
    
    // Subscribe to WebSocket updates
    websocket.connect()
    websocket.subscribeToHost(props.host)
    websocket.addEventListener('metric_update', handleMetricUpdate)
  })
  
  onUnmounted(() => {
    // Clear interval
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value)
    }
    
    // Cleanup WebSocket listeners
    websocket.removeEventListener('metric_update', handleMetricUpdate)
    websocket.unsubscribeFromHost(props.host)
  })
  </script>
  
  <style scoped>
  .apache-status-container {
    background-color: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .status-title {
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 18px;
    color: #333;
    text-align: center;
  }
  
  .loading-indicator, .error-message, .not-responsive {
    padding: 20px;
    text-align: center;
  }
  
  .error-message {
    color: #f5222d;
  }
  
  .not-responsive {
    color: #faad14;
  }
  
  .status-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  
  .status-item {
    display: flex;
    flex-direction: column;
    padding: 10px;
    background-color: #f9f9f9;
    border-radius: 4px;
  }
  
  .status-label {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
  }
  
  .status-value {
    font-size: 16px;
    font-weight: 500;
    color: #333;
  }
  
  .status-indicator {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 14px;
  }
  
  .status-icon {
    margin-right: 4px;
  }
  
  .status-indicator.online {
    background-color: #f6ffed;
    color: #52c41a;
    border: 1px solid #b7eb8f;
  }
  
  .status-indicator.offline {
    background-color: #fff2e8;
    color: #fa8c16;
    border: 1px solid #ffd591;
  }
  
  .last-updated {
    margin-top: 16px;
    text-align: right;
    font-size: 12px;
    color: #999;
  }
  </style>