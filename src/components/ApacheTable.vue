<template>
    <div>
      <a-table 
        :columns="logColumns" 
        :data-source="processedLogs" 
        :pagination="paginationConfig"
        rowKey="id"
        size="small"
        :scroll="{ y: '60vh' }"
        bordered
        class="compact-table"
      >
        <!-- Custom cell rendering for various columns -->
        <template #bodyCell="{ column, text }">
          <!-- For Timestamp: format using toLocaleString -->
          <template v-if="column.key === 'timestamp'">
            <span class="timestamp">{{ formatTimestamp(text) }}</span>
          </template>
  
          <!-- For IP Address -->
          <template v-else-if="column.key === 'ip'">
            <span>{{ text }}</span>
          </template>
  
          <!-- For Request Line -->
          <template v-else-if="column.key === 'request'">
            <span v-if="searchText && searchedColumn === 'request'" class="log-message">
              <template v-for="(frag, i) in highlightText(text, searchText)" :key="i">
                <mark v-if="frag.highlight" class="highlight">{{ frag.text }}</mark>
                <span v-else>{{ frag.text }}</span>
              </template>
            </span>
            <span v-else class="log-message">{{ text }}</span>
          </template>
  
          <!-- For Status Code with color coding -->
          <template v-else-if="column.key === 'status'">
            <span :class="getStatusClass(text)">{{ text }}</span>
          </template>
  
          <!-- For Response Size -->
          <template v-else-if="column.key === 'size'">
            <span>{{ formatSize(text) }}</span>
          </template>
        </template>
  
        <!-- Custom filter dropdown for search -->
        <template v-slot:customFilterDropdown="{
          setSelectedKeys, selectedKeys, confirm, clearFilters, column
        }">
          <div style="padding: 8px">
            <a-input
              ref="searchInput"
              :placeholder="`Search ${column.title}`"
              :value="selectedKeys[0]"
              style="width: 188px; margin-bottom: 8px; display: block"
              @input="e => setSelectedKeys(e.target.value ? [e.target.value] : [])"
              @pressEnter="() => handleSearch(selectedKeys, confirm, column.dataIndex)"
            />
            <a-button
              type="primary"
              size="small"
              style="width: 90px; margin-right: 8px"
              @click="() => handleSearch(selectedKeys, confirm, column.dataIndex)"
            >
              <SearchOutlined />
              Search
            </a-button>
            <a-button size="small" style="width: 90px" @click="() => handleReset(clearFilters)">
              Reset
            </a-button>
          </div>
        </template>
  
        <!-- Custom filter icon -->
        <template #customFilterIcon="{ filtered }">
          <SearchOutlined :style="{ color: filtered ? '#FFFFFF' : '#FFFFFF' }" />
        </template>
      </a-table>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, defineProps, watch } from 'vue';
  import { SearchOutlined } from '@ant-design/icons-vue';
  import api from '@/services/api';
  
  // Define props for host specification
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    timeRange: {
      type: [String, Object],
      default: '60m'
    },
    refreshTrigger: {
      type: Number,
      default: 0
    }
  });
  
  // Reactive state
  const logs = ref([]);
  const searchText = ref('');
  const searchedColumn = ref('');
  const searchInput = ref(null);
  const isLoading = ref(false);
  
  // Pagination configuration
  const paginationConfig = ref({
    pageSize: 25,
  });
  
  // Log columns definition
  const logColumns = [
    { 
      title: 'Timestamp', 
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 130,
      fixed: 'left'
    },
    {
      title: 'IP Address',
      dataIndex: 'ip',
      key: 'ip',
      width: 120
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      filters: [
        { text: '2xx Success', value: '2' },
        { text: '3xx Redirect', value: '3' },
        { text: '4xx Client Error', value: '4' },
        { text: '5xx Server Error', value: '5' }
      ],
      onFilter: (value, record) => record.status && record.status.toString().startsWith(value)
    },
    { 
      title: 'Request', 
      dataIndex: 'request',
      key: 'request', 
      customFilterDropdown: true
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 90
    }
  ];
  
  // Parse Apache log message into structured data
  const parseApacheLog = (logMsg) => {
    // Standard Apache log format regex
    // This will attempt to match logs in the format: IP - - [DATE] "REQUEST" STATUS SIZE "-" "USER-AGENT"
    const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\S+) "([^"]*)" "([^"]*)"$/;
    
    // Alternative regex for logs without a request (e.g. timeout)
    //const timeoutRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\S+)/;
    
    // Alternative regex for simple logs
    const simpleRegex = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d+) (\S+)/;
    
    let match = logMsg.match(regex);
    
    if (!match) {
      // Try the timeout format (with "-" as the request)
      const timeoutMatch = logMsg.match(/^(\S+) \S+ \S+ \[([^\]]+)\] "(-)" (\d+) (\S+) "([^"]*)" "([^"]*)"$/);
      if (timeoutMatch) {
        match = timeoutMatch;
      } else {
        // Try the simple format
        match = logMsg.match(simpleRegex);
      }
    }
    
    if (match) {
      const request = match[3] !== '-' ? match[3] : '(timeout)';
      return {
        ip: match[1],
        timestamp: match[2],
        request: request,
        status: match[4],
        size: match[5] !== '-' ? parseInt(match[5], 10) : 0,
        referrer: match[6] || '-',
        userAgent: match[7] || '-'
      };
    }
    
    // If no pattern matched, return data with just the raw message
    return {
      ip: 'Unknown',
      request: logMsg,
      status: 'Unknown',
      size: 0
    };
  };
  
  // Process logs to extract structured data
  const processedLogs = computed(() => {
    return logs.value.map((log, index) => {
      // Parse the log message to extract fields
      const parsedLog = parseApacheLog(log._msg || '');
      
      // Return structured log entry with original timestamp
      return {
        id: log._stream_id + '-' + index, // Create a unique ID
        timestamp: log._time,
        ip: parsedLog.ip,
        request: parsedLog.request,
        status: parsedLog.status,
        size: parsedLog.size,
        rawLog: log._msg // Keep raw log for reference
      };
    }).filter(log => {
      // Apply search filter if active
      if (searchText.value && searchedColumn.value === 'request') {
        return log.request.toLowerCase().includes(searchText.value.toLowerCase());
      }
      return true;
    }).sort((a, b) => {
      // Sort by timestamp (descending)
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });
  });
  
  async function fetchLogs() {
    try {
      isLoading.value = true;
      // Use the API method to fetch Apache logs
      const response = await api.getApacheLogs(props.host, props.timeRange);
      logs.value = response.data;
    } catch (error) {
      console.error("Error fetching Apache logs:", error);
      logs.value = []; // Ensure logs are set to an empty array on error
    } finally {
      isLoading.value = false;
    }
  }
  
  function handleSearch(selectedKeys, confirm, dataIndex) {
    confirm();
    searchText.value = selectedKeys[0];
    searchedColumn.value = dataIndex;
  }
  
  function handleReset(clearFilters) {
    clearFilters();
    searchText.value = '';
  }
  
  function highlightText(text, searchText) {
    if (!text) return [{ text: '', highlight: false }];
    
    const fragments = [];
    const regex = new RegExp(`(${searchText})`, 'gi');
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragments.push({
          text: text.substring(lastIndex, match.index),
          highlight: false,
        });
      }
      fragments.push({ text: match[0], highlight: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      fragments.push({ text: text.substring(lastIndex), highlight: false });
    }
    return fragments;
  }
  
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString("en-GB");
  }
  
  // Format response size to be more readable (KB, MB, etc.)
  function formatSize(bytes) {
    if (bytes === undefined || bytes === null || bytes === 0) return '-';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i === 0) return bytes + ' ' + sizes[i];
    
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }
  
  // Function to determine status code class for styling
  function getStatusClass(statusCode) {
    if (!statusCode || statusCode === 'Unknown') return '';
    
    const code = parseInt(statusCode);
    
    if (isNaN(code)) return '';
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 300 && code < 400) return 'status-redirect';
    if (code >= 400 && code < 500) return 'status-client-error';
    if (code >= 500) return 'status-server-error';
    
    return '';
  }
  
  // Fetch logs on component mount and when props change
  onMounted(fetchLogs);
  
  // Watch for changes in timeRange or refreshTrigger
  watch([() => props.timeRange, () => props.refreshTrigger], () => {
    fetchLogs();
  });
  </script>
  
  <style scoped>
  .compact-table :deep(.ant-table-thead > tr > th) {
    padding: 8px 8px;
    font-size: 14px;
    background-color: #008fca;
    color: white;
  }
  
  .compact-table :deep(.ant-table-tbody > tr > td) {
    padding: 4px 8px;
    font-size: 13px;
  }
  
  .compact-table :deep(.ant-table-tbody > tr) {
    transition: none;
  }
  
  .compact-table :deep(.ant-table-tbody > tr:hover > td) {
    background-color: #e6f7ff;
  }
  
  .timestamp {
    white-space: nowrap;
    font-size: 12px;
  }
  
  .log-message { 
    word-wrap: break-word; 
    white-space: pre-wrap;
    line-height: 1.3;
    display: block;
  }
  
  .highlight { 
    background-color: rgb(255, 192, 105); 
    padding: 0; 
  }
  
  /* Status code styles */
  .status-success {
    color: #52c41a;
    font-weight: bold;
  }
  
  .status-redirect {
    color: #1890ff;
    font-weight: bold;
  }
  
  .status-client-error {
    color: #faad14;
    font-weight: bold;
  }
  
  .status-server-error {
    color: #f5222d;
    font-weight: bold;
  }
  </style>