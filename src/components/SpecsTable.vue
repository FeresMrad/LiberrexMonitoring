<template>
    <div>
      <table>
        <thead>
          <tr>
            <th>Parameter</th>
            <th>Status / Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Memory</td>
            <td>{{ memoryCurrent.toFixed(1) }}/{{ memoryMax.toFixed(1) }} GB</td>
          </tr>
          <tr>
            <td>Disk</td>
            <td>{{ diskCurrent.toFixed(1) }}/{{ diskMax.toFixed(1) }} GB</td>
          </tr>
          <tr>
            <td>IP Address</td>
            <td>{{ ipAddress }}</td>
          </tr>
          <tr>
            <td>System Boot Time</td>
            <td>{{ uptime }}</td>
          </tr>
          <tr>
            <td>SSH Service</td>
            <td><router-link :to="`/entities/${props.host}/sshdetails`">Details</router-link></td>
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
  const ipAddress = ref(0);
  const uptime = ref(0);
  
  const fetchData = async () => {
    try {
        const memoryQuery = `SELECT total-available, total FROM memory WHERE host='${props.host}' order by time desc limit 1`;
        const diskQuery = `SELECT used, total FROM disk WHERE host='${props.host}' order by time desc limit 1`;
        const ipAddressQuery = `SELECT ip_adr FROM network WHERE host='${props.host}' order by time desc limit 1`;
        const uptimeQuery = `SELECT uptime_seconds FROM uptime WHERE host='${props.host}' order by time desc limit 1`;
        
        const responses = await Promise.all([
            axios.get("http://82.165.230.7:8086/query", { params: { db: "metrics", q: memoryQuery, u: "liberrex", p: "test" } }),
            axios.get("http://82.165.230.7:8086/query", { params: { db: "metrics", q: diskQuery, u: "liberrex", p: "test" } }),
            axios.get("http://82.165.230.7:8086/query", { params: { db: "metrics", q: ipAddressQuery, u: "liberrex", p: "test" } }),
            axios.get("http://82.165.230.7:8086/query", { params: { db: "metrics", q: uptimeQuery, u: "liberrex", p: "test" } })
        ]);

        const memoryResponse = responses[0].data;
        const diskResponse = responses[1].data;
        const ipResponse = responses[2].data;
        const uptimeResponse = responses[3].data;

        memoryCurrent.value = (memoryResponse.results[0]?.series[0]?.values[0][1] || 0) / 1e9;
        memoryMax.value = (memoryResponse.results[0]?.series[0]?.values[0][2] || 0) / 1e9;
        diskCurrent.value = (diskResponse.results[0]?.series[0]?.values[0][1] || 0) / 1e9;
        diskMax.value = (diskResponse.results[0]?.series[0]?.values[0][2] || 0) / 1e9;
        ipAddress.value = ipResponse.results[0]?.series[0]?.values?.[0]?.[1];

        const uptimeSeconds = uptimeResponse.results[0]?.series[0]?.values?.[0]?.[1] || 0;
        
        // Calculate system boot time
        const bootTime = new Date(Date.now() - uptimeSeconds * 1000).toLocaleString("en-GB");

        uptime.value = bootTime;

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
  