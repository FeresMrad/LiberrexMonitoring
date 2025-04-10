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
      
      <!-- Notification and Logout Icons -->
      <div class="header-icons">
        <bell-outlined class="header-icon" />
        <logout-outlined class="header-icon" />
      </div>
    </a-layout-header>

    <a-layout>
      <!-- SIDEBAR -->
      <a-layout-sider class="custom-sider" :collapsed="isCollapsed" collapsed-width="50" :style="{ position: 'fixed', zIndex: 1, height: '100vh', left: 0, top: '64px' }">
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
        </a-menu>
      </a-layout-sider>

      <!-- MAIN CONTENT AREA -->
      <a-layout class="content-layout" :style="{ marginLeft: isCollapsed ? '50px' : '200px' }">
        <a-layout-content>
          <slot></slot> <!-- The content will be injected here -->
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { HomeOutlined, DesktopOutlined, WarningOutlined, BellOutlined, LogoutOutlined, MenuOutlined } from '@ant-design/icons-vue';

const isCollapsed = ref(false);
const route = useRoute();
const selectedKeys = ref([]); // Start with an empty array

// Function to update selectedKeys based on route
const updateSelectedKeys = () => {
  const pathMap = {
    "/dashboard": ["dashboard"],
    "/entities": ["entities"],
    "/alerts": ["alerts"],
  };
  selectedKeys.value = pathMap[route.path] ;
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
  position: fixed;
  width: 100%;
  top: 0;
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
  margin-left: 5px;
  cursor: pointer;
}

/* SIDEBAR */
.custom-sider {
  background: #008fca;
  transition: width 0.2s;
  overflow-y: auto;
}

.custom-menu {
  background: #008fca;
  border-right: none;
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
  margin-top: 64px; /* Add top margin to account for fixed header */
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