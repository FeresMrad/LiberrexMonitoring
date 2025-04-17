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
              <a-form-item label="Color" name="color">
                <div class="color-picker-container">
                  <div 
                    class="color-preview" 
                    :style="{ backgroundColor: groupForm.color }"
                    @click="showColorPicker = !showColorPicker"
                  ></div>
                  <a-dropdown v-model:visible="showColorPicker" placement="bottomLeft" trigger="click">
                    <a class="ant-dropdown-link">
                      {{ groupForm.color }} <down-outlined />
                    </a>
                    <template #overlay>
                      <div class="color-picker-panel">
                        <div class="color-grid">
                          <div 
                            v-for="color in predefinedColors" 
                            :key="color" 
                            class="color-option"
                            :style="{ backgroundColor: color }"
                            @click="selectColor(color)"
                          ></div>
                        </div>
                      </div>
                    </template>
                  </a-dropdown>
                </div>
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
    ExclamationCircleOutlined,
    DownOutlined 
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
    color: '#1890ff',
    hosts: []
  });
  
  // Color picker state
  const showColorPicker = ref(false);
  const predefinedColors = [
    '#1890ff', // Blue
    '#52c41a', // Green
    '#faad14', // Yellow
    '#f5222d', // Red
    '#722ed1', // Purple
    '#eb2f96', // Pink
    '#fa8c16', // Orange
    '#13c2c2', // Cyan
    '#2f54eb', // Geekblue
    '#712eb1'  // Violet
  ];
  
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
      color: '#1890ff',
      hosts: []
    };
    groupModalVisible.value = true;
  };
  
  // Handle edit group
  const editGroup = (group) => {
    editingGroup.value = true;
    groupForm.value = { ...group };
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
          description: groupForm.value.description,
          color: groupForm.value.color
        });
        message.success('Group updated successfully');
      } else {
        // Create new group
        await api.createGroup({
          name: groupForm.value.name,
          description: groupForm.value.description,
          color: groupForm.value.color
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
  
  // Handle color selection
  const selectColor = (color) => {
    groupForm.value.color = color;
    showColorPicker.value = false;
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
  
  .color-picker-container {
    display: flex;
    align-items: center;
  }
  
  .color-preview {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    margin-right: 8px;
    cursor: pointer;
    border: 1px solid #d9d9d9;
  }
  
  .color-picker-panel {
    background: white;
    padding: 12px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  .color-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }
  
  .color-option {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid #d9d9d9;
    transition: transform 0.2s;
  }
  
  .color-option:hover {
    transform: scale(1.1);
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