<template>
    <div>
      <h2>Log Entries</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Severity</th>
            <th>Service</th>
            <th>Log Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log._stream_id">
            <td>{{ log._time }}</td>
            <td>{{ getSeverityText(log.severity) }}</td>
            <td>{{ log.app_name }}</td>
            <td>{{ log._msg }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script>
  import axios from "axios";
  
  export default {
    data() {
      return {
        logs: []
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
          console.log("logs array", this.logs);
        } catch (error) {
          console.error("Error fetching logs:", error);
        }
      },
      getSeverityText(severity) {
        const severityLevels = {
          0: "emergency",
          1: "alert",
          2: "critical",
          3: "error",
          4: "warning",
          5: "notification",
          6: "info",
          7: "debug"
        };
        return severityLevels[severity] || `Unknown (${severity})`;
      }
    },
    mounted() {
      this.fetchLogs();
    }
  };
  </script>
  
  <style scoped>
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  th {
    background-color: #f2f2f2;
  }
  </style>
  