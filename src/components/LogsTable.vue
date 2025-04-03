<template>
  <div>
    <div class="mb-4 flex items-center space-x-2">
  <a-date-picker 
    v-model:value="startDate" 
    placeholder="Start Date" 
    showTime
    :disabledDate="disabledStartDate"
  />
  <a-date-picker 
    v-model:value="endDate" 
    placeholder="End Date" 
    showTime
    :disabledDate="disabledEndDate"
  />
  <a-button type="primary" @click="refreshLogs" :loading="isLoading">
    <template #icon><RedoOutlined /></template>
    Refresh
  </a-button>
</div>


    <a-table 
      :columns="logColumns" 
      :data-source="filteredLogs" 
      :pagination="true" 
      rowKey="log._stream_id"
    >
      <!-- Custom cell rendering for various columns -->
      <template #bodyCell="{ column, text }">
        <!-- For Timestamp: format using toLocaleString ("fr-FR") -->
        <template v-if="column.key === 'timestamp'">
          <span>{{ formatTimestamp(text) }}</span>
        </template>

        <!-- For Severity: use built-in filtering along with our conversion methods -->
        <template v-else-if="column.key === 'severity'">
          <span :class="['severity', getSeverityClass(text)]">
            {{ getSeverityText(text) }}
          </span>
        </template>

        <!-- For Service (app_name) column: highlight matching text if search is active -->
        <template v-else-if="column.dataIndex === 'app_name'">
          <span v-if="searchText && searchedColumn === 'app_name'">
            <template v-for="(frag, i) in highlightText(text.toString(), searchText)" :key="i">
              <mark v-if="frag.highlight" class="highlight">{{ frag.text }}</mark>
              <span v-else>{{ frag.text }}</span>
            </template>
          </span>
          <span v-else>{{ text }}</span>
        </template>
        <template v-else-if="column.dataIndex === '_msg'">
  <span v-if="searchText && searchedColumn === '_msg'">
    <template v-for="(frag, i) in highlightText(text.toString(), searchText)" :key="i">
      <mark v-if="frag.highlight" class="highlight">{{ frag.text }}</mark>
      <span v-else>{{ frag.text }}</span>
    </template>
  </span>
  <span v-else>{{ text }}</span>
</template>


        <!-- For Log Message -->
        <template v-else>
          <span>{{ text }}</span>
        </template>
      </template>

      <!-- Custom filter dropdown for the Service column -->
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
import { SearchOutlined, RedoOutlined } from '@ant-design/icons-vue';

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
const startDate = ref(null);
const endDate = ref(null);


// Log columns definition
const logColumns = [
  { title: 'Timestamp', dataIndex: '_time', key: 'timestamp' },
  { 
    title: 'Severity', 
    dataIndex: 'severity', 
    key: 'severity',
    filters: [
      { text: 'Emergency', value: 0 },
      { text: 'Alert', value: 1 },
      { text: 'Critical', value: 2 },
      { text: 'Error', value: 3 },
      { text: 'Warning', value: 4 },
      { text: 'Notification', value: 5 },
      { text: 'Info', value: 6 },
      { text: 'Debug', value: 7 }
    ],
    onFilter: (value, record) => record.severity.toString() === value.toString(),
  },
  { 
    title: 'Service', 
    dataIndex: 'app_name', 
    key: 'app_name', 
    customFilterDropdown: true 
  },
  { 
    title: 'Log Message', 
    dataIndex: '_msg', 
    key: 'message', 
    customFilterDropdown: true // ✅ Enable custom filtering
  }
];

// Computed property for filtered and sorted logs
const filteredLogs = computed(() => {
  let logsToDisplay = logs.value;

  // Filter by service name
  if (searchText.value && searchedColumn.value === 'app_name') {
    logsToDisplay = logsToDisplay.filter(log =>
      log.app_name.toLowerCase().includes(searchText.value.toLowerCase())
    );
  }

  // ✅ Filter by log message
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


// Methods
function disabledStartDate(current) {
  const now = new Date(); // Assuming you're using dayjs

  // Disable all future dates after today
  if (current && current.isAfter(now, 'day')) {
    return true;
  }

  // If an end date is selected, disable all dates after that
  if (endDate.value) {
    return current && current.isAfter(endDate.value, 'day');
  }

  return false;
}

function disabledEndDate(current) {
  // If a start date is selected, disable all dates before that.
  if (startDate.value) {
    return current && current.isBefore(startDate.value, 'day');
  }
  return false;
}

async function fetchLogs() {
  try {
    isLoading.value = true;

    let url = `http://82.165.230.7:9428/select/logsql/query?query=hostname:${props.host}`;

    if (startDate.value) {
      const startISO = new Date(startDate.value).toISOString();
      url += `&start=${startISO}`;
    }

    if (endDate.value) {
      const endISO = new Date(endDate.value).toISOString();
      url += `&end=${endISO}`;
    }

    if (!startDate.value && !endDate.value) {
      url += `&start=5m`; // Default to last 5 minutes
    }

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

function getSeverityText(severity) {
  const levels = {
    0: "Emergency",
    1: "Alert",
    2: "Critical",
    3: "Error",
    4: "Warning",
    5: "Notification",
    6: "Info",
    7: "Debug",
  };
  return levels[severity] || `Unknown (${severity})`;
}

function getSeverityClass(severity) {
  const classes = {
    0: "emergency",
    1: "alert",
    2: "critical",
    3: "error",
    4: "warning",
    5: "notification",
    6: "info",
    7: "debug",
  };
  return classes[severity] || "unknown";
}

// New method for manually refreshing logs
function refreshLogs() {
  fetchLogs();
}

// Fetch logs on component mount
onMounted(fetchLogs);
</script>

<style scoped>
.severity {
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: bold;
  display: inline-block;
}
.severity.emergency { background-color: #ff4d4f; color: white; }
.severity.alert { background-color: #ff7a45; color: white; }
.severity.critical { background-color: #ff9c6e; color: white; }
.severity.error { background-color: #ffa39e; color: white; }
.severity.warning { background-color: #faad14; color: black; }
.severity.notification { background-color: #bae637; color: black; }
.severity.info { background-color: #1890ff; color: white; }
.severity.debug { background-color: #d9d9d9; color: black; }
.log-message { word-wrap: break-word; white-space: pre-wrap; }
.highlight { background-color: rgb(255, 192, 105); padding: 0; }
</style>