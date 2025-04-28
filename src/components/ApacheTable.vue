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

        <!-- For IP Address with highlighting -->
        <template v-else-if="column.key === 'ip'">
          <span v-if="searchText && searchedColumn === 'ip'" class="ip-address">
            <template v-for="(frag, i) in highlightText(text, searchText)" :key="i">
              <mark v-if="frag.highlight" class="highlight">{{ frag.text }}</mark>
              <span v-else>{{ frag.text }}</span>
            </template>
          </span>
          <span v-else>{{ text }}</span>
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
        
        <!-- For Response Time -->
        <template v-else-if="column.key === 'responseTime'">
          <span :class="getResponseTimeClass(text)">{{ formatResponseTime(text) }}</span>
        </template>
      </template>

      <!-- Custom filter dropdown for search -->
      <template v-slot:customFilterDropdown="{
        setSelectedKeys, selectedKeys, confirm, clearFilters, column
      }">
        <div style="padding: 8px">
          <a-input
            ref="searchInput"
            :placeholder="getPlaceholderForColumn(column.dataIndex)"
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
    width: 120,
    customFilterDropdown: true
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
    title: 'Response Time',
    dataIndex: 'responseTime',
    key: 'responseTime',
    width: 110,
    customFilterDropdown: true
  },
  {
    title: 'Size',
    dataIndex: 'size',
    key: 'size',
    width: 90,
    customFilterDropdown: true
  }
];

// Get appropriate placeholder text based on column
function getPlaceholderForColumn(columnDataIndex) {
  switch(columnDataIndex) {
    case 'responseTime':
      return 'Min response time (e.g. 500ms)';
    case 'size':
      return 'Min size (e.g. 10KB)';
    default:
      return `Search ${columnDataIndex}`;
  }
}

// Helper function to convert size string with units to bytes
function parseSizeToBytes(sizeStr) {
  const sizeStr_lower = sizeStr.toLowerCase();
  
  // Match a number followed optionally by a unit
  const match = sizeStr_lower.match(/^([\d.]+)\s*(b|kb|mb|gb)?$/);
  if (!match) return NaN;
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b'; // Default to bytes if no unit
  
  switch(unit) {
    case 'gb': return value * 1024 * 1024 * 1024;
    case 'mb': return value * 1024 * 1024;
    case 'kb': return value * 1024;
    case 'b':
    default:   return value;
  }
}

// Parse Apache log message into structured data
const parseApacheLog = (logMsg) => {
  // Combined format with response time and optional vhost
  const regex = /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP\/[\d.]+" (\d+) (\S+) (\d+)? "([^"]*)" "([^"]*)"$/;
  
  // Alternative regex for logs without a request (e.g. timeout) with response time
  const timeoutRegex = /"(-)" (\d+) (\S+) (\d+)? "([^"]*)" "([^"]*)"$/;
  
  // Alternative regex for simple logs with response time
  const simpleRegex = /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP\/[\d.]+" (\d+) (\S+) (\d+)?/;
  
  // Fallback for original combined format without response time
  const legacyRegex = /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH) ([^ ]+) HTTP\/[\d.]+" (\d+) (\S+) "([^"]*)" "([^"]*)"$/;
  
  // Additional IP extraction regex
  const ipRegex = /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;
  
  let match = logMsg.match(regex);
  let ip = 'Unknown';
  
  // Try to extract IP from the log message
  const ipMatch = logMsg.match(ipRegex);
  if (ipMatch) {
    ip = ipMatch[0];
  }
  
  if (!match) {
    // Try the timeout format (with "-" as the request) with response time
    match = logMsg.match(timeoutRegex);
    if (!match) {
      // Try the simple format with response time
      match = logMsg.match(simpleRegex);
      if (!match) {
        // Fall back to the legacy format without response time
        match = logMsg.match(legacyRegex);
        if (match) {
          // If it matches the legacy format, we need to adjust our indices
          return {
            ip: ip,
            request: match[2] !== '-' ? match[2] : '(timeout)',
            status: match[3],
            size: match[4] !== '-' ? parseInt(match[4], 10) : 0,
            responseTime: null
          };
        }
      }
    }
  }
  
  if (match) {
    const request = match[2] !== '-' ? match[2] : '(timeout)';
    return {
      ip: ip,
      request: request,
      status: match[3],
      size: match[4] !== '-' ? parseInt(match[4], 10) : 0,
      responseTime: match[5] ? parseInt(match[5], 10) : null // Response time in microseconds
    };
  }
  
  // If no pattern matched, return data with just the raw message
  return {
    ip: ip,
    request: logMsg,
    status: 'Unknown',
    size: 0,
    responseTime: null
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
      responseTime: parsedLog.responseTime,
      rawLog: log._msg // Keep raw log for reference
    };
  }).filter(log => {
    // Apply search filter for request column
    if (searchText.value && searchedColumn.value === 'request') {
      return log.request.toLowerCase().includes(searchText.value.toLowerCase());
    }
    // Apply search filter for IP column
    if (searchText.value && searchedColumn.value === 'ip') {
      return log.ip.toLowerCase().includes(searchText.value.toLowerCase());
    }
    // Apply search filter for response time column
    if (searchText.value && searchedColumn.value === 'responseTime') {
      // Skip null response times
      if (log.responseTime === null) return false;
      
      // Parse the search value, handling units if present
      let searchValueMicros;
      const searchVal = searchText.value.toLowerCase();
      
      if (searchVal.endsWith('ms')) {
        // Convert milliseconds to microseconds
        searchValueMicros = parseFloat(searchVal) * 1000;
      } else if (searchVal.endsWith('s')) {
        // Convert seconds to microseconds
        searchValueMicros = parseFloat(searchVal) * 1000000;
      } else {
        // Assume milliseconds if no unit is specified
        searchValueMicros = parseFloat(searchVal) * 1000;
      }
      
      // Only show responses that are equal to or greater than the search value
      return !isNaN(searchValueMicros) && log.responseTime >= searchValueMicros;
    }
    // Apply search filter for size column
    if (searchText.value && searchedColumn.value === 'size') {
      // Skip entries with zero size
      if (log.size === 0) return false;
      
      // Parse the search value with unit handling
      const minSizeBytes = parseSizeToBytes(searchText.value);
      
      // Only show responses with size equal to or greater than the search value
      return !isNaN(minSizeBytes) && log.size >= minSizeBytes;
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

// Format response time from microseconds to milliseconds
function formatResponseTime(micros) {
  if (micros === null || micros === undefined) return '-';
  
  // Convert microseconds to milliseconds
  const ms = micros / 1000;
  
  if (ms < 100) {
    return ms.toFixed(2) + ' ms';
  } else if (ms < 1000) {
    return ms.toFixed(1) + ' ms';
  } else {
    return (ms / 1000).toFixed(2) + ' s';
  }
}

// Function to determine response time class for styling
function getResponseTimeClass(responseTime) {
  if (responseTime === null || responseTime === undefined) return '';
  
  // Convert to milliseconds for easier comparison
  const ms = responseTime / 1000;
  
  if (ms < 500) return 'response-fast';
  if (ms < 1000) return 'response-medium';
  if (ms < 4000) return 'response-slow';
  return 'response-very-slow';
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

.ip-address {
  white-space: nowrap;
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

/* Response time styles */
.response-fast {
  color: #52c41a;
}

.response-medium {
  color: #1890ff;
}

.response-slow {
  color: #faad14;
}

.response-very-slow {
  color: #f5222d;
  font-weight: bold;
}
</style>