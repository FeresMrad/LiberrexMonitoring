// src/services/websocket.js
import { io } from 'socket.io-client';
import { ref } from 'vue';

// WebSocket configuration
const SOCKET_URL = process.env.VUE_APP_SOCKET_URL || '/socket.io';

// Create a reactive reference to track connection status
const isConnected = ref(false);

// Create socket instance
let socket = null;

// Track subscribed hosts
const subscribedHosts = new Set();

// Create an event bus to dispatch events
const listeners = {};

// Connect to the WebSocket server
const connect = () => {
  if (socket) return;

  socket = io(SOCKET_URL);

  socket.on('connect', () => {
    console.log('WebSocket connected');
    isConnected.value = true;
    
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
    emitEvent('metric_update', data);
  });

  // Add error handling
  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
};

// Disconnect from the WebSocket server
const disconnect = () => {
  if (!socket) return;

  // Unsubscribe from all hosts
  subscribedHosts.forEach(host => {
    socket.emit('unsubscribe', { host });
  });
  subscribedHosts.clear();

  socket.disconnect();
  socket = null;
};

// Subscribe to a host for updates
const subscribeToHost = (host) => {
  if (!socket) connect();

  if (!subscribedHosts.has(host)) {
    subscribedHosts.add(host);
    
    if (isConnected.value) {
      socket.emit('subscribe', { host });
      console.log(`Subscribed to host: ${host}`);
    }
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
  connect,
  disconnect,
  subscribeToHost,
  unsubscribeFromHost,
  addEventListener,
  removeEventListener
};