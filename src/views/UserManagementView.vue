<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="user-management-container">
          <div class="header-row">
            <h2>User Management</h2>
            <a-button type="primary" @click="showCreateUserModal">
              <template #icon><UserAddOutlined /></template>
              Add User
            </a-button>
          </div>
  
          <!-- User List Table -->
          <a-table 
            :columns="columns" 
            :data-source="users" 
            :loading="loading"
            rowKey="id"
          >
            <!-- Role Column -->
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'role'">
                <a-tag :color="record.role === 'admin' ? 'red' : 'blue'">
                  {{ record.role === 'admin' ? 'Admin' : 'User' }}
                </a-tag>
              </template>
  
              <!-- Permissions Column -->
              <template v-if="column.key === 'permissions'">
                <div v-if="record.permissions?.hosts === '*'">
                  <a-tag color="green">All Hosts</a-tag>
                </div>
                <div v-else-if="record.permissions?.hosts?.length > 0">
                  <a-tag color="green">{{ record.permissions.hosts.length }} Hosts</a-tag>
                </div>
                <div v-else>
                  <a-tag color="orange">No Access</a-tag>
                </div>
              </template>
  
              <!-- Actions Column -->
              <template v-if="column.key === 'actions'">
                <div class="action-buttons">
                  <a-tooltip title="Edit User">
                    <a-button type="primary" size="small" @click="editUser(record)">
                      <template #icon><EditOutlined /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="Manage Permissions">
                    <a-button type="default" size="small" @click="editPermissions(record)">
                      <template #icon><KeyOutlined /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="Delete User">
                    <a-button 
                      type="danger" 
                      size="small" 
                      @click="confirmDeleteUser(record)"
                      :disabled="record.role === 'admin' && record.id === currentUser.id"
                    >
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </div>
              </template>
            </template>
          </a-table>
        </div>
  
        <!-- Create/Edit User Modal -->
        <a-modal
          v-model:open="userModalVisible"
          :title="editingUser ? 'Edit User' : 'Create User'"
          @ok="handleUserModalOk"
          @cancel="handleUserModalCancel"
          :confirmLoading="modalLoading"
        >
          <a-form 
            :model="userForm" 
            :rules="userFormRules"
            ref="userFormRef"
            layout="vertical"
          >
            <a-form-item label="Email" name="email">
              <a-input v-model:value="userForm.email" placeholder="Email" />
            </a-form-item>
            <a-form-item label="Name" name="name">
              <a-input v-model:value="userForm.name" placeholder="Name" />
            </a-form-item>
            <a-form-item 
              :label="editingUser ? 'New Password (leave blank to keep current)' : 'Password'" 
              name="password"
            >
              <a-input-password v-model:value="userForm.password" placeholder="Password" />
            </a-form-item>
            <a-form-item label="Role" name="role">
              <a-select v-model:value="userForm.role">
                <a-select-option value="user">User</a-select-option>
                <a-select-option value="admin">Admin</a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
  
        <!-- Permissions Modal -->
        <a-modal
          v-model:open="permissionsModalVisible"
          title="Manage User Permissions"
          @ok="handlePermissionsModalOk"
          @cancel="handlePermissionsModalCancel"
          :confirmLoading="modalLoading"
        >
          <div v-if="selectedUser">
            <h3>Permissions for {{ selectedUser.name }}</h3>
            
            <div class="permission-selector">
              <a-radio-group v-model:value="permissionType" @change="handlePermissionTypeChange">
                <a-radio value="all">Access All Hosts</a-radio>
                <a-radio value="specific">Access Specific Hosts</a-radio>
                <a-radio value="none">No Host Access</a-radio>
              </a-radio-group>
            </div>
            
            <div v-if="permissionType === 'specific'" class="host-selection">
              <h4>Select Hosts</h4>
              <a-checkbox-group v-model:value="selectedHosts">
                <div v-for="host in availableHosts" :key="host.id">
                  <a-checkbox :value="host.id">{{ host.displayName }}</a-checkbox>
                </div>
              </a-checkbox-group>
            </div>
          </div>
        </a-modal>
  
        <!-- Delete Confirmation Modal -->
        <a-modal
          v-model:open="deleteModalVisible"
          title="Delete User"
          @ok="handleDeleteUser"
          @cancel="handleDeleteModalCancel"
          :confirmLoading="modalLoading"
          okType="danger"
          okText="Delete"
        >
          <div v-if="selectedUser">
            <p>Are you sure you want to delete user <strong>{{ selectedUser.name }}</strong>?</p>
            <p>This action cannot be undone.</p>
          </div>
        </a-modal>
      </HiHello>
    </a-layout>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { 
    UserAddOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    KeyOutlined 
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import HiHello from "@/components/HiHello.vue";
  import api from '@/services/api';
  import authService from '@/services/auth';
  
  // Current user
  const currentUser = computed(() => authService.currentUser.value);
  
  // User list state
  const users = ref([]);
  const loading = ref(true);
  
  // Modal state
  const userModalVisible = ref(false);
  const permissionsModalVisible = ref(false);
  const deleteModalVisible = ref(false);
  const modalLoading = ref(false);
  const editingUser = ref(false);
  const selectedUser = ref(null);
  
  // Form references and state
  const userFormRef = ref(null);
  const userForm = ref({
    email: '',
    name: '',
    password: '',
    role: 'user'
  });
  
  // Permission management state
  const availableHosts = ref([]);
  const selectedHosts = ref([]);
  const permissionType = ref('none');
  
  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email'
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      filters: [
        { text: 'Admin', value: 'admin' },
        { text: 'User', value: 'user' }
      ],
      onFilter: (value, record) => record.role === value
    },
    {
      title: 'Permissions',
      key: 'permissions'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200
    }
  ];
  
  // Form validation rules
  const userFormRules = {
    email: [
      { required: true, message: 'Please input an email address', trigger: 'blur' },
      { type: 'email', message: 'Please input a valid email address', trigger: 'blur' }
    ],
    name: [
      { required: true, message: 'Please input a name', trigger: 'blur' }
    ],
    password: [
      { 
        required: computed(() => !editingUser.value), 
        message: 'Please input a password', 
        trigger: 'blur' 
      }
    ],
    role: [
      { required: true, message: 'Please select a role', trigger: 'change' }
    ]
  };
  
  // Fetch users from API
  const fetchUsers = async () => {
    loading.value = true;
    try {
      const response = await api.getUsers();
      users.value = response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to load users');
    } finally {
      loading.value = false;
    }
  };
  
  // Fetch available hosts for permissions
  const fetchHosts = async () => {
  try {
    const response = await api.getHosts();
    // Store both host ID and display name (custom name or ID if no custom name)
    availableHosts.value = response.data.map(host => ({
      id: host.name,
      displayName: host.customName || host.name
    }));
  } catch (error) {
    console.error('Error fetching hosts:', error);
    message.error('Failed to load hosts');
  }
};
  
  // User Modal Functions
  const showCreateUserModal = () => {
    editingUser.value = false;
    userForm.value = {
      email: '',
      name: '',
      password: '',
      role: 'user'
    };
    userModalVisible.value = true;
  };
  
  const editUser = (user) => {
    editingUser.value = true;
    selectedUser.value = user;
    userForm.value = {
      id: user.id,
      email: user.email,
      name: user.name,
      password: '', // Leave blank, will only update if filled
      role: user.role
    };
    userModalVisible.value = true;
  };
  
  const handleUserModalOk = async () => {
    try {
      await userFormRef.value.validate();
      
      modalLoading.value = true;
      
      if (editingUser.value) {
        // If password is empty in edit mode, remove it from the payload
        const userData = { ...userForm.value };
        if (!userData.password) {
          delete userData.password;
        }
        
        await api.updateUser(userData.id, userData);
        message.success('User updated successfully');
      } else {
        await api.createUser(userForm.value);
        message.success('User created successfully');
      }
      
      // Refresh user list
      fetchUsers();
      userModalVisible.value = false;
    } catch (error) {
      console.error('Error saving user:', error);
      message.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      modalLoading.value = false;
    }
  };
  
  const handleUserModalCancel = () => {
    userModalVisible.value = false;
  };
  
  // Permissions Modal Functions
  const editPermissions = (user) => {
    selectedUser.value = user;
    
    // Set initial permission type
    if (user.permissions?.hosts === '*') {
      permissionType.value = 'all';
      selectedHosts.value = [];
    } else if (user.permissions?.hosts?.length > 0) {
      permissionType.value = 'specific';
      selectedHosts.value = [...user.permissions.hosts];
    } else {
      permissionType.value = 'none';
      selectedHosts.value = [];
    }
    
    permissionsModalVisible.value = true;
  };
  
  const handlePermissionTypeChange = (e) => {
    const value = e.target.value;
    if (value === 'specific' && availableHosts.value.length === 0) {
      // Load hosts if not already loaded
      fetchHosts();
    }
  };
  
  const handlePermissionsModalOk = async () => {
    modalLoading.value = true;
    
    try {
      let permissions = { hosts: [] };
      
      if (permissionType.value === 'all') {
        permissions.hosts = '*';
      } else if (permissionType.value === 'specific') {
        permissions.hosts = selectedHosts.value;
      }
      
      await api.updateUserPermissions(selectedUser.value.id, permissions);
      message.success('Permissions updated successfully');
      
      // Refresh user list
      fetchUsers();
      permissionsModalVisible.value = false;
    } catch (error) {
      console.error('Error updating permissions:', error);
      message.error('Failed to update permissions');
    } finally {
      modalLoading.value = false;
    }
  };
  
  const handlePermissionsModalCancel = () => {
    permissionsModalVisible.value = false;
  };
  
  // Delete User Functions
  const confirmDeleteUser = (user) => {
    selectedUser.value = user;
    deleteModalVisible.value = true;
  };
  
  const handleDeleteUser = async () => {
    modalLoading.value = true;
    
    try {
      await api.deleteUser(selectedUser.value.id);
      message.success('User deleted successfully');
      
      // Refresh user list
      fetchUsers();
      deleteModalVisible.value = false;
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      modalLoading.value = false;
    }
  };
  
  const handleDeleteModalCancel = () => {
    deleteModalVisible.value = false;
  };
  
  // Lifecycle hooks
  onMounted(() => {
    // Check if user is admin
    if (!authService.isAdmin()) {
      message.error('You do not have permission to access this page');
      return;
    }
    
    // Fetch initial data
    fetchUsers();
    fetchHosts();
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
  
  .action-buttons {
    display: flex;
    gap: 8px;
  }
  
  .permission-selector {
    margin-bottom: 20px;
  }
  
  .host-selection {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    padding: 10px;
  }
  
  .host-selection h4 {
    margin-top: 0;
    margin-bottom: 10px;
  }
  </style>