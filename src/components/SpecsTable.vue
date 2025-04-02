<template>
    <div>
      <table>
        <thead>
          <tr>
            <th>Resource</th>
            <th>Current</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Memory (GB)</td>
            <td>{{ memoryCurrent.toFixed(2) }}</td>
            <td>{{ memoryMax.toFixed(2) }}</td>
          </tr>
          <tr>
            <td>Disk (GB)</td>
            <td>{{ diskCurrent.toFixed(2) }}</td>
            <td>{{ diskMax.toFixed(2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, defineProps } from 'vue';
  import axios from 'axios';
  
  const props = defineProps({
    host: {
      type: String,
      required: true
    }
  });
  
  const memoryCurrent = ref(0);
  const memoryMax = ref(0);
  const diskCurrent = ref(0);
  const diskMax = ref(0);
  
  const fetchData = async () => {
    try {
      const memoryQuery = `SELECT total-available, total FROM memory WHERE host='${props.host}' order by time desc limit 1`;
      const diskQuery = `SELECT used, total FROM disk WHERE host='${props.host}' order by time desc limit 1`;
      
      const memoryResponse = await axios.get("http://82.165.230.7:8086/query", {
        params: { db: "metrics", q: memoryQuery, u: "liberrex", p: "test" }
      });
      
      const diskResponse = await axios.get("http://82.165.230.7:8086/query", {
        params: { db: "metrics", q: diskQuery, u: "liberrex", p: "test" }
      });
  
      memoryCurrent.value = (memoryResponse.data.results[0]?.series[0]?.values[0][1] || 0) / 1e9;
      memoryMax.value = (memoryResponse.data.results[0]?.series[0]?.values[0][2] || 0) / 1e9;
      diskCurrent.value = (diskResponse.data.results[0]?.series[0]?.values[0][1] || 0) / 1e9;
      diskMax.value = (diskResponse.data.results[0]?.series[0]?.values[0][2] || 0) / 1e9;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };
  
  onMounted(() => {
    fetchData();
  });
  </script>
  
  <style scoped>
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #008fca;
    color: white;
  }
  </style>
  