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
    const { token, user } = response.data;
    
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    
    // Update state
    currentUser.value = user;
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

// Refresh the current user's profile
const refreshUserProfile = async () => {
  try {
    const response = await api.getCurrentUser();
    if (response.data) {
      // Update only the current user object, don't change authentication state
      currentUser.value = response.data;
      
      // Also update localStorage
      localStorage.setItem('auth_user', JSON.stringify(response.data));
    }
    return true;
  } catch (error) {
    console.error('Error refreshing user profile:', error);
    return false;
  }
};

// Check if user is an admin
const isAdmin = () => {
  return currentUser.value?.role === 'admin';
};

// Check if user is the super admin
const isSuperAdmin = () => {
  return currentUser.value?.isSuperAdmin === true;
};

// Check if user has access to a specific host
const canAccessHost = (hostId) => {
  // Admin always has access
  if (isAdmin()) {
    return true;
  }
  
  // Not authenticated
  if (!isAuthenticated.value) {
    return false;
  }
  
  // Check user's permissions for this specific host
  const userPermissions = currentUser.value?.permissions;
  
  // If user has wildcard access
  if (userPermissions?.hosts === '*') {
    return true;
  }
  
  // Check if host is in the user's allowed hosts
  return Array.isArray(userPermissions?.hosts) && 
         userPermissions.hosts.includes(hostId);
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
  refreshUserProfile,
  isAdmin,
  isSuperAdmin,
  canAccessHost
};