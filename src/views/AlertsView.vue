<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="alerts-container">
          <div class="header-row">
            <h2 class="page-title">Alert Events</h2>
            
            <div class="header-actions">
              <!-- View Rules button (for admins) -->
              <a-button v-if="isAdmin" type="default" @click="navigateToRules" style="margin-right: 10px;">
                <template #icon><SettingOutlined /></template>
                Manage Rules
              </a-button>
            </div>
          </div>
          
          <!-- Use the new alerts table component -->
          <AlertsTable ref="alertsTableRef" />
        </div>
      </HiHello>
    </a-layout>
  </template>
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { SettingOutlined } from '@ant-design/icons-vue';
import HiHello from "@/components/HiHello.vue";
import authService from '@/services/auth';
import AlertsTable from '@/components/AlertsTable.vue';

// Router for navigation
const router = useRouter();

// Reference to the alerts table component
const alertsTableRef = ref(null);

// Computed property for admin check
const isAdmin = computed(() => authService.isAdmin());

// Navigation function to rules page
const navigateToRules = () => {
  router.push('/alerts/rules');
};


// Lifecycle hook
onMounted(() => {
  if (!authService.isAdmin()) {
    // Optional: handle non-admin user logic
  }
});
</script>
<style scoped>
.alerts-container {
  padding: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
}
</style>
  