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
import NotFoundView from "./views/NotFoundView.vue"; // Import the new 404 page
import authService from "./services/auth";
import websocket from "./services/websocket";

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
  
  // If the route requires a specific host, check permissions
  if (to.params.host && !authService.canAccessHost(to.params.host)) {
    // Redirect to dashboard if user doesn't have access to this host
    return next('/dashboard');
  }
  
  next();
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
    beforeEnter: requireAuth 
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
    beforeEnter: requireAuth 
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