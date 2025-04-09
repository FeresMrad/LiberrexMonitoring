// src/services/api.js
import axios from 'axios';

// Base URL for the API
const API_URL = process.env.VUE_APP_API_URL || 'http://82.165.230.7:5000/api';

// Create an axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper function to format time range parameters
const formatTimeRangeParams = (params, timeRange) => {
  // If timeRange is an object with start/end
  if (timeRange && typeof timeRange === 'object') {
    if (timeRange.start) params.start = timeRange.start;
    if (timeRange.end) params.end = timeRange.end;
  } 
  // If timeRange is a string (e.g., '60m')
  else if (timeRange) {
    params.timeRange = timeRange;
  }
  return params;
};

// API methods
export default {
  // Host methods
  getHosts() {
    return apiClient.get('/hosts');
  },
  
  // Metrics methods
  getCpuMetrics(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/metrics/cpu', { params });
  },
  
  getMemoryMetrics(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/metrics/memory', { params });
  },
  
  getDiskMetrics(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/metrics/disk', { params });
  },
  
  getNetworkMetrics(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/metrics/network', { params });
  },
  
  getHostSpecs(host) {
    return apiClient.get('/metrics/specs', { params: { host } });
  },
  
  // Log methods
  getLogs(host, start = null, end = null) {
    let params = { host };
    if (start) params.start = start;
    if (end) params.end = end;
    return apiClient.get('/logs', { params });
  },
  
  // SSH methods
  getSshFailedCount(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/ssh/failed', { params });
  },
  
  getSshFailedUniqueCount(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/ssh/failed/unique', { params });
  },
  
  getSshFailedIps(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/ssh/failed/ips', { params });
  },
  
  getSshFailedUsers(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/ssh/failed/users', { params });
  },
  
  getSshLogs(host, timeRange = null) {
    let params = { host };
    params = formatTimeRangeParams(params, timeRange);
    return apiClient.get('/ssh/logs', { params });
  },
  
  // Uptime
  getUptime(host) {
    return apiClient.get('/uptime', { params: { host } });
  },

  // SSH sessions - active connections
getSshSessions(host) {
  return apiClient.get('/ssh/sessions', { params: { host } });
},


getSshAcceptedUsers(host, timeRange = null) {
  let params = { host };
  params = formatTimeRangeParams(params, timeRange);
  return apiClient.get('/ssh/accepted/users', { params });
},

// New methods to get only the latest metric value
getLatestCpuMetric(host) {
  return apiClient.get('/metrics/cpu', { params: { host, latest: true } });
},

getLatestMemoryMetric(host) {
  return apiClient.get('/metrics/memory', { params: { host, latest: true } });
},

getLatestDiskMetric(host) {
  return apiClient.get('/metrics/disk', { params: { host, latest: true } });
},

};