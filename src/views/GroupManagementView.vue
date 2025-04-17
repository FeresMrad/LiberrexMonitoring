<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="group-management-container">
        <div class="header-row">
          <h2>Host Groups Management</h2>
          <a-button type="primary" @click="handleAddGroup">
            <template #icon><PlusOutlined /></template>
            Add Group
          </a-button>
        </div>

        <!-- Groups Table Component -->
        <GroupsTable ref="groupsTableRef" @refresh="handleRefresh" />

        <!-- Group Form Modal -->
        <a-modal
          v-model:open="groupModalVisible"
          :title="editingGroup ? 'Edit Group' : 'Create Group'"
          @ok="handleGroupModalOk"
          @cancel="handleGroupModalCancel"
          :confirmLoading="modalLoading"
        >
          <a-form 
            :model="groupForm" 
            :rules="groupFormRules"
            ref="groupFormRef"
            layout="vertical"
          >
            <a-form-item label="Group Name" name="name">
              <a-input v-model:value="groupForm.name" placeholder="Enter group name" />
            </a-form-item>
            <a-form-item label="Description" name="description">
              <a-textarea v-model:value="groupForm.description" placeholder="Enter description" :rows="3" />
            </a-form-item>
          </a-form>
        </a-modal>

        <!-- Delete Confirmation Modal -->
        <a-modal
          v-model:open="deleteModalVisible"
          title="Delete Group"
          @ok="confirmDeleteGroup"
          @cancel="cancelDeleteGroup"
          :confirmLoading="deleteLoading"
          okType="danger"
          okText="Delete"
        >
          <div class="delete-confirmation">
            <exclamation-circle-outlined class="warning-icon" />
            <p>Are you sure you want to delete the group <strong>{{ groupToDelete.name }}</strong>?</p>
            <p>This will not delete the hosts in this group, but they will no longer be associated with this group.</p>
          </div>
        </a-modal>
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { 
  PlusOutlined, 
  ExclamationCircleOutlined
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import HiHello from "@/components/HiHello.vue";
import GroupsTable from "@/components/GroupsTable.vue";
import api from '@/services/api';
import authService from '@/services/auth';

// Reference to the groups table component
const groupsTableRef = ref(null);

// Group form state
const groupModalVisible = ref(false);
const modalLoading = ref(false);
const editingGroup = ref(false);
const groupFormRef = ref(null);
const groupForm = ref({
  id: null,
  name: '',
  description: '',
  hosts: []
});

// Delete modal state
const deleteModalVisible = ref(false);
const deleteLoading = ref(false);
const groupToDelete = ref({});

// Form validation rules
const groupFormRules = {
  name: [
    { required: true, message: 'Please enter a group name', trigger: 'blur' }
  ]
};

// Handle add group button click
const handleAddGroup = () => {
  editingGroup.value = false;
  groupForm.value = {
    id: null,
    name: '',
    description: '',
    hosts: []
  };
  groupModalVisible.value = true;
};

// Handle edit group
const editGroup = (group) => {
  editingGroup.value = true;
  groupForm.value = { 
    id: group.id,
    name: group.name,
    description: group.description,
    hosts: group.hosts || []
  };
  groupModalVisible.value = true;
};

// Handle group form submit
const handleGroupModalOk = async () => {
  try {
    await groupFormRef.value.validate();
    
    modalLoading.value = true;
    
    if (editingGroup.value) {
      // Update existing group
      await api.updateGroup(groupForm.value.id, {
        name: groupForm.value.name,
        description: groupForm.value.description
      });
      message.success('Group updated successfully');
    } else {
      // Create new group
      await api.createGroup({
        name: groupForm.value.name,
        description: groupForm.value.description
      });
      message.success('Group created successfully');
    }
    
    // Refresh the table
    groupsTableRef.value.fetchGroups();
    
    // Close the modal
    groupModalVisible.value = false;
  } catch (error) {
    console.error('Error saving group:', error);
    message.error(error.response?.data?.error || 'Failed to save group');
  } finally {
    modalLoading.value = false;
  }
};

// Handle modal cancel
const handleGroupModalCancel = () => {
  groupModalVisible.value = false;
};

// Handle delete group
const handleDeleteGroup = (group) => {
  groupToDelete.value = group;
  deleteModalVisible.value = true;
};

// Confirm delete group
const confirmDeleteGroup = async () => {
  if (!groupToDelete.value.id) return;
  
  deleteLoading.value = true;
  
  try {
    await api.deleteGroup(groupToDelete.value.id);
    
    // Refresh the table
    groupsTableRef.value.fetchGroups();
    
    message.success(`Group "${groupToDelete.value.name}" deleted successfully`);
    deleteModalVisible.value = false;
  } catch (error) {
    console.error('Error deleting group:', error);
    message.error(error.response?.data?.error || 'Failed to delete group');
  } finally {
    deleteLoading.value = false;
  }
};

// Cancel delete
const cancelDeleteGroup = () => {
  deleteModalVisible.value = false;
  groupToDelete.value = {};
};

// Handle refresh event from child component
const handleRefresh = () => {
  groupsTableRef.value.fetchGroups();
};

// Lifecycle hooks
onMounted(() => {
  // Check if user is admin
  if (!authService.isAdmin()) {
    message.error('You do not have permission to access this page');
    return;
  }
  
  // Make editGroup and handleDeleteGroup available to the table component
  groupsTableRef.value?.setEditHandler(editGroup);
  groupsTableRef.value?.setDeleteHandler(handleDeleteGroup);
});
</script>

<style scoped>
.group-management-container {
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

.delete-confirmation {
  text-align: center;
}

.warning-icon {
  font-size: 48px;
  color: #ff4d4f;
  margin-bottom: 16px;
}
</style>