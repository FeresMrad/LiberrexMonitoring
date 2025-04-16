import { createApp } from "vue";
import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";
import MetricsView from "./views/MetricsView.vue";
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import DashboardView from "./views/DashboardView.vue";
import EntitiesView from "./views/EntitiesView.vue";
import TestView from "./views/TestView.vue";
import SshDetailsView from "./views/SshDetailsView.vue";
import LoginView from "./views/LoginView.vue";
import NotFoundView from "./views/NotFoundView.vue";
import UserManagementView from "./views/UserManagementView.vue"; // Import the new user management view
import authService from "./services/auth";
import websocket from "./services/websocket";
import api from "./services/api";
import { message } from 'ant-design-vue';

// Authentication guard for protected routes
const requireAuth = (to, from, next) => {
  // Check for auth token in localStorage directly for simplicity
  const token = localStorage.getItem('auth_token');
  const userJson = localStorage.getItem('auth_user');
  
  if (!token || !userJson) {
    // No token or user data, redirect to login
    return next('/login');
  }
  
  // Make sure authentication state is updated
  if (!authService.isAuthenticated.value) {
    try {
      // Initialize auth state from localStorage
      const userData = JSON.parse(userJson);
      authService.currentUser.value = userData;
      authService.isAuthenticated.value = true;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return next('/login');
    }
  }
  
  // All authenticated users have access to all routes
  next();
};

// Admin role guard
const requireAdmin = (to, from, next) => {
  // First check authentication
  requireAuth(to, from, () => {
    // If user is authenticated and is admin, allow access
    if (authService.isAdmin()) {
      next();
    } else {
      // Otherwise redirect to dashboard
      message.error('You do not have permission to access this page');
      next('/dashboard');
    }
  });
};

// Host access guard
const requireHostAccess = (to, from, next) => {
  // First check authentication
  requireAuth(to, from, () => {
    // Get the host from the route params
    const host = to.params.host;
    
    // Admin always has access
    if (authService.isAdmin()) {
      next();
      return;
    }
    
    // Check if the user has access to this host
    api.getAccessibleHosts()
      .then(response => {
        const hostAccess = response.data.find(h => h.host === host);
        
        if (hostAccess && hostAccess.access) {
          next(); // User has access, proceed
        } else {
          // User doesn't have access, redirect to entities list
          message.error('You do not have access to this host');
          next('/entities');
        }
      })
      .catch(error => {
        console.error('Error checking host access:', error);
        next('/entities'); // Redirect on error
      });
  });
};

// Routes configuration
const routes = [
  { path: "/login", component: LoginView },
  { 
    path: "/alerts", 
    component: TestView, 
    beforeEnter: requireAuth 
  },
  { 
    path: "/entities/:host", 
    component: MetricsView, 
    beforeEnter: requireHostAccess
  },
  { 
    path: "/dashboard", 
    component: DashboardView, 
    beforeEnter: requireAuth 
  },
  { 
    path: "/entities", 
    component: EntitiesView, 
    beforeEnter: requireAuth 
  },
  { 
    path: "/entities/:host/sshdetails", 
    component: SshDetailsView,
    beforeEnter: requireHostAccess
  },
  {
    path: "/admin/users",
    component: UserManagementView,
    beforeEnter: requireAdmin // Use admin guard for this route
  },
  // Redirect root to login or dashboard
  { 
    path: "/", 
    redirect: () => {
      return localStorage.getItem('auth_token') ? '/dashboard' : '/login';
    }
  },
  // 404 route - must be the last route
  { 
    path: "/:pathMatch(.*)*", 
    component: NotFoundView,
    beforeEnter: requireAuth 
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Global navigation guard to handle auth state changes
router.beforeEach((to, from, next) => {
  // Always allow access to login
  if (to.path === '/login') {
    return next();
  }
  
  // Connect to WebSocket if authenticated
  if (authService.isAuthenticated.value) {
    // Ensure WebSocket is connected when navigating between authenticated routes
    if (!websocket.isConnected.value) {
      websocket.connect();
    }
  }
  
  next();
});

const app = createApp(App);
app.use(router);
app.use(Antd).mount("#app");