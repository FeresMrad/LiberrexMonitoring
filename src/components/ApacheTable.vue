<template>
    <div>
      <a-table 
        :columns="logColumns" 
        :data-source="filteredLogs" 
        :pagination="paginationConfig"
        rowKey="log._stream_id"
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
            <span v-if="searchText && searchedColumn === 'request_line'" class="log-message">
              <template v-for="(frag, i) in highlightText(text.toString(), searchText)" :key="i">
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
      dataIndex: '_time', 
      key: 'timestamp',
      width: 130,
      fixed: 'left'
    },
    {
      title: 'IP Address',
      dataIndex: 'client_ip',
      key: 'ip',
      width: 120
    },
    { 
      title: 'Request', 
      dataIndex: 'request_line', 
      key: 'request', 
      customFilterDropdown: true
    },
    {
      title: 'Status',
      dataIndex: 'status_code',
      key: 'status',
      width: 80,
      filters: [
        { text: '2xx Success', value: '2' },
        { text: '3xx Redirect', value: '3' },
        { text: '4xx Client Error', value: '4' },
        { text: '5xx Server Error', value: '5' }
      ],
      onFilter: (value, record) => record.status_code && record.status_code.toString().startsWith(value)
    },
    {
      title: 'Size',
      dataIndex: 'response_size',
      key: 'size',
      width: 90
    }
  ];
  
  // Computed property for filtered and sorted logs
  const filteredLogs = computed(() => {
    let logsToDisplay = logs.value;
  
    // Filter by request line
    if (searchText.value && searchedColumn.value === 'request_line') {
      logsToDisplay = logsToDisplay.filter(log =>
        log.request_line && log.request_line.toLowerCase().includes(searchText.value.toLowerCase())
      );
    }
  
    return logsToDisplay.sort((a, b) => {
      const timeA = new Date(a._time).getTime();
      const timeB = new Date(b._time).getTime();
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
    if (bytes === undefined || bytes === null) return '-';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    if (i === 0) return bytes + ' ' + sizes[i];
    
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }
  
  // Function to determine status code class for styling
  function getStatusClass(statusCode) {
    if (!statusCode) return '';
    
    const code = parseInt(statusCode);
    
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