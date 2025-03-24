<template>
    <div>
      <h2>Log Entries</h2>
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Log Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log._stream_id">
            <td>{{ log._time }}</td>
            <td>{{ log._msg }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script>
  import axios from 'axios';
  
  export default {
    data() {
      return {
        logs: [] 
      };
    },
    methods: {
  async fetchLogs() {
    try {
      const response = await axios.get('http://82.165.230.7:9428/select/logsql/query?query=*&limit=10', {
        transformResponse: [(data) => {
          // Handle NDJSON (Newline Delimited JSON)
          return data.trim().split("\n").map(line => JSON.parse(line));
        }]
      });

      console.log("API Response:", response.data);
      this.logs = response.data; 
      console.log("logs array", this.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  }
}
,
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
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  th {
    background-color: #f2f2f2;
  }
  </style>
  