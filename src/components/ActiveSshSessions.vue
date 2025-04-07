<template>
    <div class="active-ssh-sessions">
      <h3>Active SSH Sessions</h3>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">Error: {{ error }}</div>
      <div v-else>
        <div class="session-count">
          <span class="count">{{ sessions.length }}</span>
          <span class="label">active sessions</span>
        </div>
        
        <div class="sessions-table" v-if="sessions.length > 0">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Session</th>
                <th>From</th>
                <th>Login Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(session, index) in sessions" :key="index">
                <td>{{ session.user }}</td>
                <td>{{ session.tty }}</td>
                <td>{{ formatSource(session.from) }}</td>
                <td>{{ session.login_time }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="no-sessions">No active SSH sessions</div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, watch, defineProps } from 'vue'
  import api from '@/services/api'
  
  const props = defineProps({
    host: {
      type: String,
      required: true
    },
    refreshTrigger: {
      type: Number,
      default: 0
    }
  })
  
  const sessions = ref([])
  const loading = ref(true)
  const error = ref(null)
  
  const fetchSessions = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await api.getSshSessions(props.host)
      sessions.value = response.data.sessions || []
    } catch (err) {
      error.value = err.message
      sessions.value = []
    } finally {
      loading.value = false
    }
  }
  
  // Format the source IP/hostname
  const formatSource = (source) => {
    // Remove parentheses if they exist
    return source.replace(/[()]/g, '')
  }
  
  // Fetch data when the component mounts and when refreshTrigger changes
  onMounted(fetchSessions)
  watch(() => props.refreshTrigger, fetchSessions)
  </script>
  
  <style scoped>
  .active-ssh-sessions {
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 8px;
    background-color: #f9f9f9;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  h3 {
    margin: 0 0 15px 0;
    font-size: 18px;
    text-align: center;
  }
  
  .session-count {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .count {
    font-size: 36px;
    font-weight: bold;
    color: #008fca;
  }
  
  .label {
    font-size: 14px;
    color: #666;
  }
  
  .sessions-table {
    max-height: 200px;
    overflow-y: auto;
  }
  
  table {
    width: 100%;
    border-collapse: collapse;
  }
  
  th {
    background-color: #008fca;
    color: white;
    padding: 8px;
    text-align: left;
    font-size: 14px;
  }
  
  td {
    padding: 6px 8px;
    border-bottom: 1px solid #ddd;
    font-size: 13px;
  }
  
  tr:nth-child(even) {
    background-color: #f2f2f2;
  }
  
  tr:hover {
    background-color: #e6f7ff;
  }
  
  .no-sessions {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 10px;
  }
  
  .loading, .error {
    text-align: center;
    padding: 10px;
  }
  
  .error {
    color: #ff4d4f;
  }
  </style>