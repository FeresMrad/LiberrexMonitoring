<template>
  <a-layout style="min-height: 100vh">
    <!-- HEADER -->
    <a-layout-header class="header">
      <!-- Menu Icon to Collapse Sidebar -->
      <menu-outlined @click="toggleSidebar" class="header-icon left-icon" />
      
      <!-- Logo aligned to the left of the menu icon -->
      <a href="/dashboard">
        <img src="../assets/logoliberrex.png" alt="Logo" class="header-logo" />
      </a>
      
      <!-- User Info and Logout -->
      <div class="header-icons">
        <span v-if="currentUser" class="user-info">
          {{ currentUser.email }}
        </span>
        <bell-outlined class="header-icon" />
        <logout-outlined class="header-icon" @click="handleLogout" />
      </div>
    </a-layout-header>

    <a-layout>
      <!-- SIDEBAR -->
      <a-layout-sider class="custom-sider" :collapsed="isCollapsed" collapsed-width="50">
        <a-menu v-model:selectedKeys="selectedKeys" mode="inline" class="custom-menu">
          <router-link to="/dashboard">
            <a-menu-item key="dashboard">
              <home-outlined />
              <span>Dashboard</span>
            </a-menu-item>
          </router-link>
          <router-link to="/entities">
            <a-menu-item key="entities">
              <desktop-outlined />
              <span>Entities</span>
            </a-menu-item>
          </router-link>
          <router-link to="/alerts">
            <a-menu-item key="alerts">
              <warning-outlined />
              <span>Alerts</span>
            </a-menu-item>
          </router-link>
          
          <!-- Admin section with groups link -->
          <template v-if="isAdmin">
            <a-divider style="margin: 8px 0; background-color: rgba(255, 255, 255, 0.2)" />
            <router-link to="/admin/users">
              <a-menu-item key="users">
                <team-outlined />
                <span>Users</span>
              </a-menu-item>
            </router-link>
            <router-link to="/admin/groups">
              <a-menu-item key="groups">
                <apartment-outlined />
                <span>Groups</span>
              </a-menu-item>
            </router-link>
          </template>
        </a-menu>
      </a-layout-sider>

      <!-- MAIN CONTENT AREA -->
      <a-layout class="content-layout">
        <a-layout-content>
          <slot></slot> <!-- The content will be injected here -->
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { 
  HomeOutlined, 
  DesktopOutlined, 
  WarningOutlined, 
  BellOutlined, 
  LogoutOutlined, 
  MenuOutlined,
  TeamOutlined,
  ApartmentOutlined 
} from '@ant-design/icons-vue';
import authService from '@/services/auth';
import websocket from '@/services/websocket';

const isCollapsed = ref(false);
const route = useRoute();
const router = useRouter();
const selectedKeys = ref([]); // Start with an empty array

// Get current user from auth service
const currentUser = computed(() => authService.currentUser.value);

// Check if user is admin
const isAdmin = computed(() => authService.isAdmin());

// Function to update selectedKeys based on route
const updateSelectedKeys = () => {
  const pathMap = {
    "/dashboard": ["dashboard"],
    "/entities": ["entities"],
    "/alerts": ["alerts"],
    "/admin/users": ["users"],
  };
  
  // Check if the current path or a parent path is in the pathMap
  const path = route.path;
  if (pathMap[path]) {
    selectedKeys.value = pathMap[path];
  } else if (path.startsWith('/entities/')) {
    selectedKeys.value = ["entities"];
  }
};

// Handle logout
const handleLogout = () => {
  authService.logout();
  websocket.disconnect();
  router.push('/login');
};

// Watch for route changes and update menu selection
watch(route, updateSelectedKeys);

// Set the correct selection when the page loads
onMounted(updateSelectedKeys);

// Toggle sidebar collapse/expand
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
/* HEADER */
.header {
  background: white;
  padding: 0 16px;
  display: flex;
  align-items: center;
  height: 64px;
  box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.1);
  justify-content: flex-start;
  padding-left: 0; /* Remove the left padding */
  width: 100%;
  z-index: 2;
}

/* Move the logo and menu icon closer */
.header-logo {
  height: 34px;
  width: auto;
  margin-left: 5px; /* Move logo to the left */
}

/* Header Icons */
.header-icons {
  display: flex;
  align-items: center;
  margin-left: auto; /* Align icons to the right */
}

.header-icon {
  font-size: 18px;
  margin-left: 15px;
  cursor: pointer;
}

/* User info styling */
.user-info {
  margin-right: 15px;
  font-size: 14px;
  color: #008fca;
  font-weight: bold;
}

/* SIDEBAR */
.custom-sider {
  background: #008fca;
  transition: width 0.2s;
  overflow-y: auto;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 1;
}

.custom-menu {
  background: #008fca;
  border-right: none;
  position: sticky;
  top: 0;
}

/* Ensure menu text is always white */
.custom-menu :deep(.ant-menu-item),
.custom-menu :deep(.ant-menu-submenu-title) {
  color: white;
}

/* Hover effect */
.custom-menu :deep(.ant-menu-item:hover),
.custom-menu :deep(.ant-menu-submenu-title:hover) {
  background: white;
  color: black;
}

/* Selected item effect */
.custom-menu :deep(.ant-menu-item-selected) {
  background: white;
  color: black;
}

/* MAIN CONTENT AREA */
.content-layout {
  padding: 16px;
  transition: margin-left 0.2s;
}

/* FOOTER */
.footer {
  text-align: center;
  background: white;
  padding: 16px;
  box-shadow: 0px -2px 5px rgba(0, 0, 0, 0.1);
}
</style>