<template>
    <div>
      <h2>Log Entries</h2>
      <a-table :columns="logColumns" :data-source="logs" :pagination="false">
        <template v-slot:bodyCell="{ column, text }">
          <template v-if="column.key === 'severity'">
            <span :class="['severity', getSeverityClass(text)]">
              {{ getSeverityText(text) }}
            </span>
          </template>
          <template v-if="column.key === 'message'">
            <span class="log-message">{{ text }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </template>
  
  <script>
  import axios from "axios";
  
  export default {
    data() {
      return {
        logs: [],
        logColumns: [
          { title: "Timestamp", dataIndex: "_time", key: "timestamp" },
          { title: "Severity", dataIndex: "severity", key: "severity" },
          { title: "Service", dataIndex: "app_name", key: "service" },
          { title: "Log Message", dataIndex: "_msg", key: "message" }
        ]
      };
    },
    methods: {
      async fetchLogs() {
        try {
          const response = await axios.get(
            "http://82.165.230.7:9428/select/logsql/query?query=*&limit=10",
            {
              transformResponse: [
                (data) => {
                  return data
                    .trim()
                    .split("\n")
                    .map((line) => JSON.parse(line));
                }
              ]
            }
          );
  
          console.log("API Response:", response.data);
          this.logs = response.data;
        } catch (error) {
          console.error("Error fetching logs:", error);
        }
      },
      getSeverityText(severity) {
        const severityLevels = {
          0: "Emergency",
          1: "Alert",
          2: "Critical",
          3: "Error",
          4: "Warning",
          5: "Notification",
          6: "Info",
          7: "Debug"
        };
        return severityLevels[severity] || `Unknown (${severity})`;
      },
      getSeverityClass(severity) {
        const classes = {
          0: "emergency",
          1: "alert",
          2: "critical",
          3: "error",
          4: "warning",
          5: "notification",
          6: "info",
          7: "debug"
        };
        return classes[severity] || "unknown";
      }
    },
    mounted() {
      this.fetchLogs();
    }
  };
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
  
  .log-message {
    word-wrap: break-word;
    white-space: pre-wrap;
  }
  </style>