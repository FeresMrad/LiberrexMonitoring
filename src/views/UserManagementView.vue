<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="user-management-container">
        <div class="header-row">
          <h2>User Management</h2>
          <a-button type="primary" @click="handleAddUser">
            <template #icon><UserAddOutlined /></template>
            Add User
          </a-button>
        </div>

        <!-- User Table Component -->
        <UsersTable ref="usersTableRef" @refresh="handleRefresh" />
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { UserAddOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import HiHello from "@/components/HiHello.vue";
import UsersTable from "@/components/UsersTable.vue";
import authService from '@/services/auth';

// Reference to the users table component
const usersTableRef = ref(null);

// Handle add user button click
const handleAddUser = () => {
  usersTableRef.value.showCreateUserModal();
};

// Handle refresh event from child component
const handleRefresh = () => {
  // Additional refresh logic can be added here if needed
};

// Lifecycle hooks
onMounted(() => {
  // Check if user is admin
  if (!authService.isAdmin()) {
    message.error('You do not have permission to access this page');
    return;
  }
});
</script>

<style scoped>
.user-management-container {
  padding: 20px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-row h2 {
  margin: 0;
}
</style>