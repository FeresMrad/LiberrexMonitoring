import { io } from 'socket.io-client';
import { ref } from 'vue';

// WebSocket configuration - explicitly set the URL
// When using the Vue dev server with proxy, we don't need the full URL, just the path
const socket_path = '/socket.io'; // This will be proxied according to the vue.config.js

// Create reactive references to track connection status
const isConnected = ref(false);
const isAuthenticated = ref(false);
const authError = ref(null);

// Create socket instance
let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// Track subscribed hosts
const subscribedHosts = new Set();

// Create an event bus to dispatch events
const listeners = {};

// Connect to the WebSocket server
const connect = () => {
  if (socket) return;

  // Get authentication token from localStorage
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    console.error('Authentication token not found. Please log in first.');
    authError.value = 'You must log in before connecting.';
    return;
  }

  // Create with explicit Socket.IO configuration
  socket = io({
    path: socket_path,
    transports: ['websocket', 'polling'], // Try WebSocket first, fall back to polling
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    timeout: 20000,
    auth: { token }, // Include token in auth object
    query: { token }  // Also include in query params for compatibility
  });

  socket.on('connect', () => {
    console.log('WebSocket connected successfully');
    isConnected.value = true;
    isAuthenticated.value = true;
    authError.value = null;
    reconnectAttempts = 0;
    
    // Re-subscribe to previously subscribed hosts
    subscribedHosts.forEach(host => {
      socket.emit('subscribe', { host });
    });
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
    isConnected.value = false;
  });

  // Listen for metric updates
  socket.on('metric_update', (data) => {
    console.log('Received metric update:', data.measurement);
    emitEvent('metric_update', data);
  });

  // Add error handling with retry logic
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
    
    // Check if it's an authentication error
    if (error.message && (error.message.includes('authentication') || error.message.includes('token'))) {
      authError.value = 'Authentication failed. Please log in again.';
      isAuthenticated.value = false;
      // Don't attempt to reconnect on auth failures
      socket.disconnect();
      socket = null;
    } else {
      // For other errors, we can try to reconnect up to MAX_RECONNECT_ATTEMPTS
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
        disconnect();
      }
    }
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};

// Disconnect from the WebSocket server
const disconnect = () => {
  if (!socket) return;

  try {
    // Unsubscribe from all hosts
    subscribedHosts.forEach(host => {
      socket.emit('unsubscribe', { host });
    });
    subscribedHosts.clear();

    socket.disconnect();
  } catch (error) {
    console.error('Error during WebSocket disconnect:', error);
  } finally {
    socket = null;
    isConnected.value = false;
    reconnectAttempts = 0;
  }
};

// Subscribe to a host for updates
const subscribeToHost = (host) => {
  if (!socket) connect();
  
  if (!isConnected.value) {
    console.error('Cannot subscribe: WebSocket not connected');
    return;
  }

  if (!subscribedHosts.has(host)) {
    subscribedHosts.add(host);
    socket.emit('subscribe', { host });
    console.log(`Subscribed to host: ${host}`);
  }
};

// Unsubscribe from a host
const unsubscribeFromHost = (host) => {
  if (!socket || !isConnected.value) return;

  if (subscribedHosts.has(host)) {
    subscribedHosts.delete(host);
    socket.emit('unsubscribe', { host });
    console.log(`Unsubscribed from host: ${host}`);
  }
};

// Event bus methods
const addEventListener = (event, callback) => {
  if (!listeners[event]) {
    listeners[event] = [];
  }
  listeners[event].push(callback);
};

const removeEventListener = (event, callback) => {
  if (!listeners[event]) return;
  
  const index = listeners[event].indexOf(callback);
  if (index !== -1) {
    listeners[event].splice(index, 1);
  }
};

const emitEvent = (event, data) => {
  if (!listeners[event]) return;
  
  listeners[event].forEach(callback => {
    callback(data);
  });
};

export default {
  isConnected,
  isAuthenticated,
  authError,
  connect,
  disconnect,
  subscribeToHost,
  unsubscribeFromHost,
  addEventListener,
  removeEventListener
};