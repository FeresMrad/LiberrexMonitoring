<template>
    <div>
      <a-table 
        :columns="logColumns" 
        :data-source="filteredLogs" 
        :pagination="false"
        rowKey="log._stream_id"
        size="small"
        :scroll="{ y: '70vh' }"
        bordered
        class="compact-table"
      >
        <!-- Custom cell rendering for various columns -->
        <template #bodyCell="{ column, text }">
          <!-- For Timestamp: format using toLocaleString -->
          <template v-if="column.key === 'timestamp'">
            <span class="timestamp">{{ formatTimestamp(text) }}</span>
          </template>
  
          <!-- For Log Message -->
          <template v-else-if="column.dataIndex === '_msg'">
            <span v-if="searchText && searchedColumn === '_msg'" class="log-message">
              <template v-for="(frag, i) in highlightText(text.toString(), searchText)" :key="i">
                <mark v-if="frag.highlight" class="highlight">{{ frag.text }}</mark>
                <span v-else>{{ frag.text }}</span>
              </template>
            </span>
            <span v-else class="log-message">{{ text }}</span>
          </template>
  
          <!-- For other columns -->
          <template v-else>
            <span>{{ text }}</span>
          </template>
        </template>
  
        <!-- Custom filter dropdown for the Log Message column -->
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
          <SearchOutlined :style="{ color: filtered ? '#108ee9' : undefined }" />
        </template>
      </a-table>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, defineProps } from 'vue';
  import axios from 'axios';
  import { SearchOutlined } from '@ant-design/icons-vue';
  
  // Define props for host specification
  const props = defineProps({
    host: {
      type: String,
      required: true
    }
  });
  
  // Reactive state
  const logs = ref([]);
  const searchText = ref('');
  const searchedColumn = ref('');
  const searchInput = ref(null);
  const isLoading = ref(false);
  
  // Log columns definition - with adjusted width for timestamp
  const logColumns = [
    { 
      title: 'Timestamp', 
      dataIndex: '_time', 
      key: 'timestamp',
      width: 130,
      fixed: 'left'
    },
    { 
      title: 'Recent Logs', 
      dataIndex: '_msg', 
      key: 'message', 
      customFilterDropdown: true
    }
  ];
  
  // Computed property for filtered and sorted logs
  const filteredLogs = computed(() => {
    let logsToDisplay = logs.value;
  
    // Filter by log message
    if (searchText.value && searchedColumn.value === '_msg') {
      logsToDisplay = logsToDisplay.filter(log =>
        log._msg.toLowerCase().includes(searchText.value.toLowerCase())
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
  
      let url = `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}+app_name:sshd`;
      url += `&start=60m`; // Default to last 5 minutes
  
      const response = await axios.get(url, {
        transformResponse: [
          (data) => {
            if (!data || data.trim() === "") {
              return []; // Return an empty array instead of parsing
            }
            return data
              .trim()
              .split("\n")
              .map(line => {
                try {
                  return JSON.parse(line);
                } catch (error) {
                  console.error("Error parsing log entry:", line);
                  return null; // Skip invalid JSON lines
                }
              })
              .filter(log => log !== null); // Remove any null values
          }
        ]
      });
  
      console.log("API Response:", response.data);
      logs.value = response.data;
    } catch (error) {
      console.error("Error fetching logs:", error);
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
  
  // Fetch logs on component mount
  onMounted(fetchLogs);
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
  </style>