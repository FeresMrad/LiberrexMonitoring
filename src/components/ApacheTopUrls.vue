<template>
    <div class="top-urls-container">
      <h3 class="chart-title">Total Responses</h3>
      
      <!-- Status code filter -->
      <div class="status-filter">
        <button 
          v-for="filter in statusFilters" 
          :key="filter.value" 
          :class="['status-button', currentStatusFilter === filter.value ? 'active' : '']"
          @click="setStatusFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>
      
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else>
        <div class="url-bars">
          <div v-for="(item, index) in filteredUrls" :key="index" class="url-bar-container">
            <div class="url-label" :title="item.url">{{ truncateUrl(item.url) }}</div>
            <div class="bar-container">
              <div class="bar" :style="{ width: `${item.percentage}%`, backgroundColor: getBarColor(item.percentage) }"></div>
            </div>
            <div class="count-label">{{ item.count }}</div>
          </div>
        </div>
        
        <div v-if="filteredUrls.length === 0" class="no-data">
          No URL data available for the selected filter
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted, defineProps, watch } from 'vue';
  import api from '@/services/api';
  
  // Component props
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    refreshTrigger: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 10  // Show top 10 URLs by default
    }
  });
  
  // Reactive state
  const logs = ref([]);
  const loading = ref(true);
  const error = ref(null);
  const refreshInterval = ref(null);
  const currentStatusFilter = ref('all');
  
  // Status filter options
  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: '2xx', value: '2xx' },
    { label: '3xx', value: '3xx' },
    { label: '4xx', value: '4xx' },
    { label: '5xx', value: '5xx' }
  ];
  
  // Set the status filter
  const setStatusFilter = (filter) => {
    currentStatusFilter.value = filter;
  };
  
  // Parse Apache logs to extract URLs and status codes
  const parseLogEntry = (logMsg) => {
    // Try to match the HTTP request pattern and status code
    const regex = /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP\/[\d.]+" (\d+)/;
    const match = logMsg.match(regex);
    
    if (match && match[2] && match[3]) {
      return {
        url: match[2],
        statusCode: match[3]
      };
    }
    
    return null;
  };
  
  // Get status code category (2xx, 3xx, etc.)
  const getStatusCategory = (statusCode) => {
    if (!statusCode) return null;
    return `${statusCode[0]}xx`;
  };
  
  // Process logs to count URL occurrences with status filtering
  const urlData = computed(() => {
    // Count occurrences of each URL with status info
    const urlCounts = {};
    let totalCount = 0;
    
    logs.value.forEach(log => {
      const parsedLog = parseLogEntry(log._msg || '');
      if (parsedLog && parsedLog.url) {
        const { url, statusCode } = parsedLog;
        const category = getStatusCategory(statusCode);
        
        // Skip if we're filtering by status and this doesn't match
        if (currentStatusFilter.value !== 'all' && category !== currentStatusFilter.value) {
          return;
        }
        
        if (!urlCounts[url]) {
          urlCounts[url] = 0;
        }
        urlCounts[url]++;
        totalCount++;
      }
    });
    
    return { urlCounts, totalCount };
  });
  
  // Filtered and sorted URLs based on current status filter
  const filteredUrls = computed(() => {
    const { urlCounts, totalCount } = urlData.value;
    
    // Convert to array and sort by count (descending)
    const sortedUrls = Object.keys(urlCounts)
      .map(url => ({
        url,
        count: urlCounts[url],
        percentage: totalCount > 0 ? (urlCounts[url] / totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, props.limit); // Limit to the top N URLs
    
    return sortedUrls;
  });
  
  // Fetch logs from the API - always use 60m time range
  const fetchLogs = async () => {
    try {
      loading.value = true;
      const response = await api.getApacheLogs(props.host, '60m');
      logs.value = response.data;
      error.value = null;
    } catch (err) {
      console.error("Error fetching Apache logs:", err);
      error.value = "Failed to load Apache logs";
      logs.value = [];
    } finally {
      loading.value = false;
    }
  };
  
  // Helper function to truncate long URLs
  const truncateUrl = (url) => {
    const maxLength = 40;
    if (url.length <= maxLength) return url;
    
    // Extract query parameters
    const [path, query] = url.split('?');
    
    // If it's just a long path, truncate the middle
    if (!query && path.length > maxLength) {
      const startLength = Math.floor(maxLength * 0.6);
      const endLength = maxLength - startLength - 3; // 3 for "..."
      return `${path.substring(0, startLength)}...${path.substring(path.length - endLength)}`;
    }
    
    // If there are query parameters, show the path and indicate params exist
    if (query) {
      if (path.length > maxLength - 5) {
        return `${path.substring(0, maxLength - 5)}...?…`;
      }
      return `${path}?…`;
    }
    
    return url;
  };
  
  // Function to get a color based on the percentage
  const getBarColor = (percentage) => {
    // Create a gradient from green (low) to red (high)
    const hue = Math.max(0, Math.min(120, (100 - percentage) * 1.2)); // 120 is green, 0 is red
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  // Watch for changes in refreshTrigger
  watch(() => props.refreshTrigger, () => {
    fetchLogs();
  });
  
  // Setup automatic refresh
  onMounted(() => {
    fetchLogs();
    
    // Refresh data every 60 seconds
    // refreshInterval.value = setInterval(() => {
    //   fetchLogs();
    // }, 60000);
  });
  
  // Clean up on unmount
  onUnmounted(() => {
    if (refreshInterval.value) {
      clearInterval(refreshInterval.value);
    }
  });
  </script>
  
  <style scoped>
  .top-urls-container {
    background-color: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    height: 100%; /* Take full height of parent */
  }
  
  .chart-title {
    text-align: center;
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 18px;
    font-weight: bold;
    color: #008fca;
  }
  
  .url-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 15px;
    margin-top: 15px;
    max-height: 210px; /* Fixed height */
    overflow-y: auto; /* Enable vertical scrolling */
    padding-right: 5px; /* Add padding for scrollbar */
  }
  
  .url-bar-container {
    display: grid;
    grid-template-columns: minmax(130px, 2fr) 5fr minmax(60px, 1fr);
    align-items: center;
    gap: 10px;
  }
  
  .url-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    text-align: right;
    padding-right: 5px;
    color: #333;
  }
  
  .bar-container {
    height: 25px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .bar {
    height: 100%;
    transition: width 0.5s ease;
  }
  
  .count-label {
    font-size: 14px;
    font-weight: bold;
    padding-left: 5px;
    text-align: left;
  }
  
  .loading, .error, .no-data {
    text-align: center;
    padding: 20px;
    color: #666;
  }
  
  .error {
    color: #ff4d4f;
  }
  
  /* Status code filter styles */
  .status-filter {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
    margin-bottom: 10px;
  }
  
  .status-button {
    padding: 3px 10px;
    font-size: 12px;
    background-color: #d9d9d9;
    color: #333;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .status-button:hover {
    opacity: 0.9;
  }
  
  .status-button.active {
    font-weight: bold;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
  }
  
  /* Status button colors */
  .status-button[key="all"].active {
    background-color: #008fca;
    color: white;
  }
  
  .status-button[key="2xx"].active {
    background-color: #52c41a;
    color: white;
  }
  
  .status-button[key="3xx"].active {
    background-color: #1890ff;
    color: white;
  }
  
  .status-button[key="4xx"].active {
    background-color: #faad14;
    color: white;
  }
  
  .status-button[key="5xx"].active {
    background-color: #f5222d;
    color: white;
  }
  </style>