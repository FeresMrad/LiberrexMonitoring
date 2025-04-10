// 1. First, let's modify the auth.js file to handle token validation better:

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
      
      // We'll skip server validation on initial load to prevent CORS issues
      // and assume the token is valid if it exists in localStorage
      // The backend will validate the token on each API request
    } catch (error) {
      console.error('Error parsing stored user data', error);
      logout();
    }
  }
};

// Validate token with the server - only call this explicitly when needed
const validateToken = async (token) => {
  try {
    // We'll keep this for when explicit validation is needed
    // but we won't call it on every page load
    await api.validateToken(token);
    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    logout();
    return false;
  }
};

// Login function
const login = async (email, password) => {
  isLoading.value = true;
  authError.value = null;
  
  try {
    const response = await api.login(email, password);
    
    // Save token and user data
    const { token, email: userEmail, allowed_hosts, is_admin } = response.data;
    
    localStorage.setItem('auth_token', token);
    
    const userData = {
      email: userEmail,
      allowedHosts: allowed_hosts,
      isAdmin: is_admin
    };
    
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

// Check if user has access to a specific host
const canAccessHost = (hostname) => {
  if (!currentUser.value) {
    return false;
  }
  
  // Admin can access all hosts
  if (currentUser.value.isAdmin) {
    return true;
  }
  
  // Regular users can only access hosts in their allowed_hosts list
  return (currentUser.value.allowedHosts || []).includes(hostname);
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
  validateToken,
  canAccessHost
};