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

// API methods
export default {
  // Host methods
  getHosts() {
    return apiClient.get('/hosts');
  },
  
  // Metrics methods
  getCpuMetrics(host, timeRange = null) {
    let params = { host };
    if (timeRange) params.timeRange = timeRange;
    return apiClient.get('/metrics/cpu', { params });
  },
  
  getMemoryMetrics(host, timeRange = null) {
    let params = { host };
    if (timeRange) params.timeRange = timeRange;
    return apiClient.get('/metrics/memory', { params });
  },
  
  getDiskMetrics(host, timeRange = null) {
    let params = { host };
    if (timeRange) params.timeRange = timeRange;
    return apiClient.get('/metrics/disk', { params });
  },
  
  getNetworkMetrics(host, timeRange = null) {
    let params = { host };
    if (timeRange) params.timeRange = timeRange;
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
  getSshFailedCount(host) {
    return apiClient.get('/ssh/failed', { params: { host } });
  },
  
  getSshFailedUniqueCount(host) {
    return apiClient.get('/ssh/failed/unique', { params: { host } });
  },
  
  getSshFailedIps(host) {
    return apiClient.get('/ssh/failed/ips', { params: { host } });
  },
  
  getSshFailedUsers(host) {
    return apiClient.get('/ssh/failed/users', { params: { host } });
  },
  
  getSshLogs(host) {
    return apiClient.get('/ssh/logs', { params: { host } });
  },
  
  // Uptime
  getUptime(host) {
    return apiClient.get('/uptime', { params: { host } });
  }
};