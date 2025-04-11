// src/services/auth.js
import { ref } from 'vue';
import api from './api';
import websocket from './websocket';

// User state
const currentUser = ref(null);
const isAuthenticated = ref(false);
const authError = ref(null);
const isLoading = ref(false);

// Initialize auth state from localStorage on page load
const initAuth = () => {
  const token = localStorage.getItem('auth_token');
  const userJson = localStorage.getItem('auth_user');
  
  if (token && userJson) {
    try {
      currentUser.value = JSON.parse(userJson);
      isAuthenticated.value = true;
    } catch (error) {
      console.error('Error parsing stored user data', error);
      logout();
    }
  }
};

// Login function
const login = async (email, password) => {
  isLoading.value = true;
  authError.value = null;
  
  try {
    const response = await api.login(email, password);
    
    // Save token and user data
    const { token, email: userEmail } = response.data;
    
    localStorage.setItem('auth_token', token);
    
    // Simplified user data
    const userData = { email: userEmail };
    
    localStorage.setItem('auth_user', JSON.stringify(userData));
    
    // Update state
    currentUser.value = userData;
    isAuthenticated.value = true;
    
    // Connect to websocket with the new token
    websocket.connect();
    
    return true;
  } catch (error) {
    console.error('Login failed:', error);
    authError.value = error.response?.data?.error || 'Login failed. Please try again.';
    return false;
  } finally {
    isLoading.value = false;
  }
};

// Logout function
const logout = () => {
  // Disconnect from WebSocket
  websocket.disconnect();
  
  // Clear stored data
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  
  // Reset state
  currentUser.value = null;
  isAuthenticated.value = false;
};

// Check if user has access to a specific host - simplified
const canAccessHost = () => {
  // All authenticated users can access all hosts
  return isAuthenticated.value;
};

// Initialize on service creation
initAuth();

export default {
  currentUser,
  isAuthenticated,
  authError,
  isLoading,
  login,
  logout,
  canAccessHost
};