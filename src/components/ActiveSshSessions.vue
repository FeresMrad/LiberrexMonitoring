<template>
    <div class="active-ssh-sessions">
      <h3>Active Connections - Unique Session</h3>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">Error: {{ error }}</div>
      <div v-else>
        <div v-if="sessions.length > 0" class="table-container">
          <table>
            <thead>
              <tr>
                <th class="user-col">User</th>
                <th class="session-col">Session</th>
                <th class="from-col">From</th>
                <th class="login-time-col">Login Time</th>
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

.table-container {
  position: relative;
  max-height: 260px;
  overflow: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}

/* Table layout */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

/* Sticky header */
thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #008fca;
  color: white;
}

th, td {
  padding: 8px;
  border-bottom: 1px solid #ccc;
  font-size: 14px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Column width specifications */
.user-col {
  width: 15%;
}

.session-col {
  width: 15%;
}

.from-col {
  width: 35%; /* Increased width for IP addresses */
}

.login-time-col {
  width: 35%;
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