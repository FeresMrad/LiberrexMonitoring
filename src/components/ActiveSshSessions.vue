<template>
    <div class="active-ssh-sessions">
      <h3>Active Connections - Unique Session</h3>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">Error: {{ error }}</div>
      <div v-else>
        <table v-if="sessions.length > 0">
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
    text-align: center;
  padding: 10px;
  max-width: 500px;
  margin-top: -5px;
  }
  
  h3 {
    margin: 0;
    font-size: 18px;
    margin-bottom: 10px;
  }
  
  /* Table layout */
  table {
    width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin-top: 5px;
  }
  
  /* Sticky header */
  thead {
    background-color: #008fca;
  color: white;
  position: sticky;
  top: 0;
  z-index: 1;

  }
  
  th, td {
    padding: 8px;
    border-bottom: 1px solid #ccc;
    font-size: 13px;
    text-align: left;
  }
  
  /* Make only the tbody scrollable */
  tbody {
    display: block;
  max-height: 260px;
  overflow-y: auto;
  overflow-x: hidden;
  width: 100%;
  }
  
  /* Ensure rows align with header */
  thead, tbody tr {
    display: table;
  width: 100%;
  table-layout: fixed;
  }
  
  .no-sessions {
    text-align: center;
    color: #666;
    font-style: italic;
    padding: 10px;
    margin-top: 20px;
  }
    
  .loading, .error {
    text-align: center;
    padding: 10px;
  }
    
  .error {
    color: #ff4d4f;
  }
  </style>