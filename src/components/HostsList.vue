<template>
    <a-table :columns="hostsColumns" :data-source="hostsData" :pagination="false">
      <template v-slot:bodyCell="{ column, text, record }">
        <template v-if="column.key === 'activity'">
          <span :class="text.isDown ? 'activity down' : 'activity up'">
            {{ text.isDown ? text.timestamp : "Active" }}
          </span>
        </template>
  
        <template v-if="column.key === 'name'">
          <a @click="redirectToHostPage(record.name)">
            {{ text }}
          </a>
        </template>
  
        <!-- Gauge Chart for CPU Usage -->
<template v-if="column.key === 'cpuUsage'">
  <a-progress 
    :percent="text" 
    type="dashboard" 
    :stroke-color="getColor(text)" 
    size="small" 
  />
</template>

<!-- Gauge Chart for Memory Usage -->
<template v-if="column.key === 'memoryUsage'">
  <a-progress 
    :percent="text" 
    type="dashboard" 
    :stroke-color="getColor(text)" 
    size="small" 
  />
</template>

<!-- Gauge Chart for Disk Usage -->
<template v-if="column.key === 'diskUsage'">
  <a-progress 
    :percent="text" 
    type="dashboard" 
    :stroke-color="getColor(text)" 
    size="small" 
  />
</template>

      </template>
    </a-table>
  </template>
  
  <script setup>
  import { ref, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import axios from "axios";
  
  const router = useRouter();
  const hostsData = ref([]);
  
  const hostsColumns = ref([
    { title: "Hosts", dataIndex: "name", key: "name" },
    { title: "IP Address", dataIndex: "ip", key: "ip" },
    { title: "CPU", dataIndex: "cpuUsage", key: "cpuUsage" },
    { title: "Memory", dataIndex: "memoryUsage", key: "memoryUsage" },
    { title: "Disk", dataIndex: "diskUsage", key: "diskUsage" },
    { title: "System Boot", dataIndex: "systemBoot", key: "systemBoot" },
    { title: "Activity", dataIndex: "activity", key: "activity" }
  ]);
  
  const fetchHosts = async () => {
    try {
      const response = await axios.get("http://82.165.230.7:8086/query", {
        params: {
          db: "metrics",
          q: 'SHOW TAG VALUES WITH KEY = "host"',
          u: "liberrex",
          p: "test"
        }
      });
  
      const values = response.data.results[0]?.series[0]?.values || [];
      hostsData.value = await Promise.all(
        values.map(async (item, index) => {
          const hostName = item[1];
  
          const fetchMetric = async (metric, field, retries = 3) => {
            try {
              const res = await axios.get("http://82.165.230.7:8086/query", {
                params: {
                  db: "metrics",
                  q: `SELECT "${field}" FROM "${metric}" WHERE "host" = '${hostName}' ORDER BY time DESC LIMIT 1`,
                  u: "liberrex",
                  p: "test"
                }
              });
              const value = res.data.results[0]?.series[0]?.values?.[0]?.[1];
              if (value !== undefined && value !== null) {
                return value;
              } else {
                throw new Error("Data not found");
              }
            } catch (error) {
              if (retries > 0) {
                console.warn(`Error fetching ${metric} - Retrying... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // delay before retrying
                return fetchMetric(metric, field, retries - 1);
              } else {
                console.error(`Failed to fetch ${metric} after retries`);
                return 0; // Return 0 if all retries fail
              }
            }
          };
  
          const ipAddress = await fetchMetric("network", "ip_adr");
          const cpuUsage = await fetchMetric("cpu", "percent");
          const memoryUsage = await fetchMetric("memory", "percent");
          const diskUsage = await fetchMetric("disk", "percent");
  
          const uptimeResponse = await axios.get("http://82.165.230.7:8086/query", {
            params: {
              db: "metrics",
              q: `SELECT "uptime_seconds" FROM "uptime" WHERE "host" = '${hostName}' ORDER BY time DESC LIMIT 1`,
              u: "liberrex",
              p: "test"
            }
          });
          const uptimeValues = uptimeResponse.data.results[0]?.series[0]?.values || [];
          let activity = {},
            systemBootTime = "Unknown";
  
          if (uptimeValues.length > 0) {
            const lastUptimeTimestampStr = uptimeValues[0][0];
            const lastUptimeTimestamp = new Date(lastUptimeTimestampStr);
            const uptimeSeconds = uptimeValues[0][1];
            const currentTime = new Date();
            systemBootTime = new Date(currentTime.getTime() - uptimeSeconds * 1000).toLocaleString("en-GB");
            activity =
              (currentTime.getTime() - lastUptimeTimestamp.getTime()) / 1000 > 61
                ? { isDown: true, timestamp: lastUptimeTimestamp.toLocaleString("en-GB") }
                : { isDown: false };
          } else {
            activity = { isDown: true, timestamp: "Unknown" };
          }
  
          return {
            key: index.toString(),
            name: hostName,
            ip: ipAddress,
            cpuUsage,
            diskUsage,
            memoryUsage,
            systemBoot: systemBootTime,
            activity
          };
        })
      );
    } catch (error) {
      console.error("Error fetching hosts:", error);
    }
  };
  
  const redirectToHostPage = hostName => {
    router.push(`/entities/${hostName}`);
  };

  const getColor = (value) => {
  if (value < 50) return "#52c41a"; // Green
  if (value >= 50 && value < 80) return "#faad14"; // Orange
  return "#ff4d4f"; // Red
};

  
  onMounted(fetchHosts);
  </script>
  
  <style scoped>
  .activity {
    padding: 4px 8px;
    border-radius: 4px;
    display: inline-block;
    font-weight: bold;
    text-align: center;
  }
  
  .activity.up {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .activity.down {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  </style>
  