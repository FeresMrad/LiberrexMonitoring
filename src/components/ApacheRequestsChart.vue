<template>
    <div class="top-items-container">
      <h3 class="chart-title">{{ chartTitle }}</h3>
      
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
        <div class="item-bars">
          <div v-for="(item, index) in filteredItems" :key="index" class="item-bar-container">
            <div class="item-label" :title="item.key">
              {{ formatItemLabel(item.key) }}
            </div>
            <div class="bar-container">
              <div class="bar" :style="{ width: `${item.percentage}%`, backgroundColor: getBarColor(item.percentage) }"></div>
            </div>
            <div class="count-label">{{ item.count }}</div>
          </div>
        </div>
        
        <div v-if="filteredItems.length === 0" class="no-data">
          No data available for the selected filter
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, defineProps, watch } from 'vue';
  import api from '@/services/api';
  
  // Component props
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    itemType: {
      type: String,
      required: true,
      validator: (value) => ['ips', 'urls'].includes(value)
    },
    timeRange: {
      type: [String, Object],
      default: '60m'
    },
    refreshTrigger: {
      type: Number,
      default: 0
    },
    limit: {
      type: Number,
      default: 10  // Show top 10 items by default
    }
  });
  
  // Chart title based on itemType
  const chartTitle = computed(() => {
    return props.itemType === 'ips' ? 'Top Source IP Addresses' : 'Top Responses';
  });
  
  // Reactive state
  const logs = ref([]);
  const loading = ref(true);
  const error = ref(null);
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
  
  // Parse Apache logs to extract relevant information
  const parseLogEntry = (logMsg) => {
    if (props.itemType === 'ips') {
      // For IPs: Extract IP and status code
      const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]+)" (\d+)/;
      const match = logMsg.match(regex);
      
      if (match) {
        return {
          ip: match[1],
          statusCode: match[4]
        };
      }
    } else {
      // For URLs: Extract URL and status code
      const regex = /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP\/[\d.]+" (\d+)/;
      const match = logMsg.match(regex);
      
      if (match && match[2] && match[3]) {
        return {
          url: match[2],
          statusCode: match[3]
        };
      }
    }
    
    return null;
  };
  
  // Get status code category (2xx, 3xx, etc.)
  const getStatusCategory = (statusCode) => {
    if (!statusCode) return null;
    return `${statusCode[0]}xx`;
  };
  
  // Process logs to count item occurrences with status filtering
  const itemData = computed(() => {
    // Count occurrences of each item with status info
    const itemCounts = {};
    let totalCount = 0;
    
    logs.value.forEach(log => {
      const parsedLog = parseLogEntry(log._msg || '');
      if (parsedLog) {
        const item = props.itemType === 'ips' ? parsedLog.ip : parsedLog.url;
        const category = getStatusCategory(parsedLog.statusCode);
        
        // Skip if we're filtering by status and this doesn't match
        if (currentStatusFilter.value !== 'all' && category !== currentStatusFilter.value) {
          return;
        }
        
        if (!itemCounts[item]) {
          itemCounts[item] = 0;
        }
        itemCounts[item]++;
        totalCount++;
      }
    });
    
    return { itemCounts, totalCount };
  });
  
  // Filtered and sorted items based on current status filter
  const filteredItems = computed(() => {
    const { itemCounts, totalCount } = itemData.value;
    
    // Convert to array and sort by count (descending)
    const sortedItems = Object.keys(itemCounts)
      .map(key => ({
        key,
        count: itemCounts[key],
        percentage: totalCount > 0 ? (itemCounts[key] / totalCount) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, props.limit); // Limit to the top N items
    
    return sortedItems;
  });
  
  // Format item label based on itemType
  const formatItemLabel = (label) => {
    if (props.itemType === 'urls') {
      const maxLength = 40;
      if (label.length <= maxLength) return label;
      
      // Extract query parameters
      const [path, query] = label.split('?');
      
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
      
      return label;
    }
    
    // For IPs, return as is
    return label;
  };
  
  // Fetch logs from the API using the current timeRange
  const fetchLogs = async () => {
    try {
      loading.value = true;
      const response = await api.getApacheLogs(props.host, props.timeRange);
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
  
  // Function to get a color based on the percentage
  const getBarColor = (percentage) => {
    // Create a gradient from green (low) to red (high)
    const hue = Math.max(0, Math.min(120, (100 - percentage) * 1.2)); // 120 is green, 0 is red
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  // Watch for changes in timeRange and refreshTrigger props
  watch([() => props.timeRange, () => props.refreshTrigger], () => {
    fetchLogs();
  });
  
  // Setup initial data load
  onMounted(() => {
    fetchLogs();
  });
  
  </script>
  
  <style scoped>
  .top-items-container {
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
  
  .item-bars {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 15px;
    margin-top: 15px;
    max-height: 210px; /* Fixed height */
    overflow-y: auto; /* Enable vertical scrolling */
    padding-right: 5px; /* Add padding for scrollbar */
  }
  
  .item-bar-container {
    display: grid;
    grid-template-columns: minmax(130px, 2fr) 5fr minmax(60px, 1fr);
    align-items: center;
    gap: 10px;
  }
  
  .item-label {
    display: flex;
    align-items: center;
    justify-content: flex-end;
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