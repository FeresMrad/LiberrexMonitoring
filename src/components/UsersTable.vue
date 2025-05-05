<template>
    <div class="users-table-container">
      <!-- User List Table -->
      <a-table 
        :columns="columns" 
        :data-source="users" 
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
            <div v-if="record.role === 'admin'">
              <a-tag color="red">Admin Access</a-tag>
            </div>
            <div v-else-if="record.permissions?.hosts === '*'">
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
                <a-button 
                  type="default" 
                  size="small" 
                  @click="editUser(record)" 
                  :disabled="isSuperAdmin(record) || (record.role === 'admin' && !isSuperAdmin())"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Manage Permissions">
                <a-button 
                  type="default" 
                  size="small" 
                  @click="editPermissions(record)" 
                  :disabled="isSuperAdmin(record) || record.role === 'admin'"
                >
                  <template #icon><KeyOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete User">
                <a-button 
                  type="default" 
                  size="small" 
                  @click="confirmDeleteUser(record)"
                  :disabled="isSuperAdmin(record) || (record.role === 'admin' && !isSuperAdmin())" 
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
  
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
            <a-select v-model:value="userForm.role" :disabled="!isSuperAdmin() && userForm.role === 'admin'">
              <a-select-option value="user">User</a-select-option>
              <a-select-option value="admin">Admin</a-select-option>
            </a-select>
          </a-form-item>
        </a-form>
      </a-modal>
  
      <!-- Permissions Modal -->
      <a-modal
        v-model:open="permissionsModalVisible"
        @ok="handlePermissionsModalOk"
        @cancel="handlePermissionsModalCancel"
        :confirmLoading="modalLoading"
        width="700px"
      >
        <div v-if="selectedUser" class="permissions-container">
          <h3>Permissions for {{ selectedUser.name }}</h3>
          
          <!-- Global Access Toggle -->
          <div class="permission-all-hosts">
            <a-radio-group v-model:value="permissionType" @change="handlePermissionTypeChange">
              <a-radio value="all">Access All Hosts</a-radio>
              <a-radio value="specific">Select Hosts</a-radio>
              <a-radio value="none">No Access</a-radio>
            </a-radio-group>
          </div>
          
          <!-- Host Selection Section - Only show if "specific" is selected -->
          <div v-if="permissionType === 'specific'" class="host-selection-container">
            <!-- Tabs for Groups and Hosts -->
            <a-tabs v-model:activeKey="activeTabKey">
              <a-tab-pane key="hosts" tab="Hosts">
                <div class="host-selection">
                  <a-spin v-if="hostsLoading" />
                  <template v-else>
                    <a-input 
                      v-model:value="hostSearchText" 
                      placeholder="Search hosts..." 
                      style="margin-bottom: 10px"
                      allow-clear
                    />
                    
                    <div class="selection-stats">
                      <span>{{ selectedHosts.length }} hosts selected</span>
                      <div class="selection-actions">
                        <a-button size="small" @click="selectAllHosts">Select All</a-button>
                        <a-button size="small" @click="deselectAllHosts">Deselect All</a-button>
                      </div>
                    </div>
                    
                    <a-checkbox-group v-model:value="selectedHosts" class="host-checkbox-group">
                      <div 
                        v-for="host in filteredHosts" 
                        :key="host.id" 
                        class="host-item"
                      >
                        <a-checkbox :value="host.id">
                          <div class="host-info">
                            <span class="host-name">{{ host.displayName }}</span>
                            <span v-if="isHostInSelectedGroup(host.id)" class="host-group-tag">
                              In selected group
                            </span>
                          </div>
                        </a-checkbox>
                      </div>
                    </a-checkbox-group>
                    <a-empty v-if="filteredHosts.length === 0" description="No hosts found" />
                  </template>
                </div>
              </a-tab-pane>
              
              <a-tab-pane key="groups" tab="Groups">
                <div class="group-selection">
                  <a-spin v-if="groupsLoading" />
                  <template v-else>
                    <a-input 
                      v-model:value="groupSearchText" 
                      placeholder="Search groups..." 
                      style="margin-bottom: 10px"
                      allow-clear
                    />
                    
                    <a-checkbox-group v-model:value="selectedGroups" @change="updateHostsFromGroups" class="group-checkbox-group">
                      <div 
                        v-for="group in filteredGroups" 
                        :key="group.id" 
                        class="group-item"
                      >
                        <a-checkbox :value="group.id">
                          <div class="group-info">
                            <div class="group-name">{{ group.name }}</div>
                            <div class="group-description">{{ group.description }}</div>
                            <div class="host-count">{{ group.hosts ? group.hosts.length : 0 }} hosts</div>
                          </div>
                        </a-checkbox>
                      </div>
                    </a-checkbox-group>
                    <a-empty v-if="filteredGroups.length === 0" description="No groups found" />
                  </template>
                </div>
              </a-tab-pane>
            </a-tabs>
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
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, defineEmits, defineExpose, computed, watch } from 'vue';
  import { 
    EditOutlined, 
    DeleteOutlined, 
    KeyOutlined 
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import api from '@/services/api';
  import authService from '@/services/auth';
  
  // Event emits
  const emit = defineEmits(['refresh']);
  
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
  const permissionType = ref('none'); // 'all', 'specific', or 'none'
  const availableHosts = ref([]);
  const selectedHosts = ref([]);
  const hostsLoading = ref(false);
  const hostSearchText = ref('');
  
  // Group management state
  const availableGroups = ref([]);
  const selectedGroups = ref([]);
  const groupsLoading = ref(false);
  const groupSearchText = ref('');
  
  // Group/host mapping
  const groupToHostsMap = ref({});
  
  // Tab selection
  const activeTabKey = ref('hosts');
  
  // Filtered hosts and groups based on search
  const filteredHosts = computed(() => {
    if (!hostSearchText.value) {
      return availableHosts.value;
    }
    const searchLower = hostSearchText.value.toLowerCase();
    return availableHosts.value.filter(host => 
      host.displayName.toLowerCase().includes(searchLower)
    );
  });
  
  const filteredGroups = computed(() => {
    if (!groupSearchText.value) {
      return availableGroups.value;
    }
    const searchLower = groupSearchText.value.toLowerCase();
    return availableGroups.value.filter(group => 
      group.name.toLowerCase().includes(searchLower) || 
      (group.description && group.description.toLowerCase().includes(searchLower))
    );
  });
  
  // Helper function to check if a host is in any selected group
  const isHostInSelectedGroup = (hostId) => {
    for (const groupId of selectedGroups.value) {
      if (groupToHostsMap.value[groupId]?.includes(hostId)) {
        return true;
      }
    }
    return false;
  };
  
  // Select/deselect all hosts
  const selectAllHosts = () => {
    selectedHosts.value = availableHosts.value.map(host => host.id);
  };
  
  const deselectAllHosts = () => {
    selectedHosts.value = [];
  };
  
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
        required: false,
        validator: (rule, value) => {
          // Only require password in create mode, not in edit mode
          if (!editingUser.value) {
            return value ? Promise.resolve() : Promise.reject('Please input a password');
          }
          // In edit mode, password is optional
          return Promise.resolve();
        },
        trigger: 'blur' 
      }
    ],
    role: [
      { required: true, message: 'Please select a role', trigger: 'change' }
    ]
  };
  
  // Handle permission type change
  const handlePermissionTypeChange = (e) => {
    const value = e.target.value;
    permissionType.value = value;
    
    if (value === 'specific') {
      // Load hosts and groups if they aren't already loaded
      if (availableHosts.value.length === 0) {
        fetchHosts();
      }
      if (availableGroups.value.length === 0) {
        fetchGroups();
      }
    }
  };
  
  // Update selected hosts when groups change
  const updateHostsFromGroups = () => {
    // Start with hosts that were manually selected
    let newSelectedHosts = [...selectedHosts.value];
    
    // Add hosts from selected groups
    selectedGroups.value.forEach(groupId => {
      const groupHosts = groupToHostsMap.value[groupId] || [];
      groupHosts.forEach(hostId => {
        if (!newSelectedHosts.includes(hostId)) {
          newSelectedHosts.push(hostId);
        }
      });
    });
    
    selectedHosts.value = newSelectedHosts;
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
    hostsLoading.value = true;
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
    } finally {
      hostsLoading.value = false;
    }
  };
  
  // Fetch and process groups
  const fetchGroups = async () => {
    groupsLoading.value = true;
    try {
      const response = await api.getGroups();
      availableGroups.value = response.data;
      
      // Create a mapping of group IDs to host IDs
      const mapping = {};
      for (const group of response.data) {
        mapping[group.id] = group.hosts || [];
      }
      groupToHostsMap.value = mapping;
    } catch (error) {
      console.error('Error fetching groups:', error);
      message.error('Failed to load host groups');
    } finally {
      groupsLoading.value = false;
    }
  };
  
  // Show modal for creating a new user
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
  
  // Super admin identification helpers
  const isSuperAdmin = (user) => {
    if (user) {
      // When checking a specific user
      return user.id === 'admin';
    } else {
      // When checking current user
      return authService.isSuperAdmin();
    }
  };
  
  // Edit an existing user
  const editUser = (user) => {
    if (isSuperAdmin(user)) {
      message.warning("The system administrator account cannot be modified");
      return;
    }
    
    // Only super admin can edit other admin accounts
    if (user.role === 'admin' && !isSuperAdmin()) {
      message.warning("Only the super administrator can modify other admin accounts");
      return;
    }
    
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
  
  // Handle user modal OK button
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
      emit('refresh');
    } catch (error) {
      console.error('Error saving user:', error);
      message.error(error.response?.data?.error || 'Failed to save user');
    } finally {
      modalLoading.value = false;
    }
  };
  
  // Handle user modal cancel
  const handleUserModalCancel = () => {
    userModalVisible.value = false;
  };
  
  // Edit permissions for a user
  const editPermissions = (user) => {
    selectedUser.value = user;
    
    // Reset search fields
    hostSearchText.value = '';
    groupSearchText.value = '';
    
    // Set initial values based on user's current permissions
    if (user.permissions?.hosts === '*') {
      permissionType.value = 'all';
      selectedHosts.value = [];
      selectedGroups.value = [];
    } else if (user.permissions?.hosts && user.permissions.hosts.length > 0) {
      permissionType.value = 'specific';
      selectedHosts.value = [...user.permissions.hosts];
      
      // If we already have the groups data, try to infer which groups are selected
      if (Object.keys(groupToHostsMap.value).length > 0) {
        inferSelectedGroups();
      }
      
      // Load hosts and groups data
      fetchHosts();
      fetchGroups();
    } else {
      permissionType.value = 'none';
      selectedHosts.value = [];
      selectedGroups.value = [];
    }
    
    permissionsModalVisible.value = true;
  };
  
  // Infer which groups should be selected based on the selected hosts
  const inferSelectedGroups = () => {
    const newSelectedGroups = [];
    
    for (const [groupId, hostIds] of Object.entries(groupToHostsMap.value)) {
      // Check if all hosts in the group are selected
      const allHostsSelected = hostIds.every(hostId => selectedHosts.value.includes(hostId));
      if (allHostsSelected && hostIds.length > 0) {
        newSelectedGroups.push(groupId);
      }
    }
    
    selectedGroups.value = newSelectedGroups;
  };
  
  // Handle permissions modal OK button
  const handlePermissionsModalOk = async () => {
    modalLoading.value = true;
    
    try {
      let permissions = {};
      
      if (permissionType.value === 'all') {
        // All hosts access
        permissions = { hosts: '*' };
      } else if (permissionType.value === 'specific') {
        // Specific hosts - note we only need to save the host IDs
        // The group info is only used during the selection process
        permissions = { hosts: selectedHosts.value };
      } else {
        // No access
        permissions = { hosts: [] };
      }
      
      await api.updateUserPermissions(selectedUser.value.id, permissions);
      message.success('Permissions updated successfully');
      
      // Refresh user list
      fetchUsers();
      permissionsModalVisible.value = false;
      emit('refresh');
    } catch (error) {
      console.error('Error updating permissions:', error);
      message.error(error.response?.data?.error || 'Failed to update permissions');
    } finally {
      modalLoading.value = false;
    }
  };
  
  // Handle permissions modal cancel
  const handlePermissionsModalCancel = () => {
    permissionsModalVisible.value = false;
  };
  
  // Confirm deleting a user
  const confirmDeleteUser = (user) => {
    // Super admin account cannot be deleted
    if (isSuperAdmin(user)) {
      message.warning("The system administrator account cannot be deleted");
      return;
    }
    
    // Only super admin can delete other admin accounts
    if (user.role === 'admin' && !isSuperAdmin()) {
      message.warning("Only the super administrator can delete other admin accounts");
      return;
    }
    
    selectedUser.value = user;
    deleteModalVisible.value = true;
  };
  
  // Handle delete user
  const handleDeleteUser = async () => {
    modalLoading.value = true;
    
    try {
      await api.deleteUser(selectedUser.value.id);
      message.success('User deleted successfully');
      
      // Refresh user list
      fetchUsers();
      deleteModalVisible.value = false;
      emit('refresh');
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error(error.response?.data?.error || 'Failed to delete user');
    } finally {
      modalLoading.value = false;
    }
  };
  
  // Handle delete modal cancel
  const handleDeleteModalCancel = () => {
    deleteModalVisible.value = false;
  };
  
  // Watch for group selection changes to update hosts
  watch(selectedGroups, () => {
    updateHostsFromGroups();
  });
  
  // Lifecycle hooks
  onMounted(() => {
    // If user data exists, refresh to get latest user role/permissions
    if (authService.isAuthenticated.value) {
      authService.refreshUserProfile();
    }
    
    // Fetch initial data
    fetchUsers();
  });
  
  // Expose functions for parent component
  defineExpose({
    fetchUsers,
    showCreateUserModal
  });
  </script>
  
  <style scoped>
  .users-table-container {
    width: 100%;
  }
  
  .action-buttons {
    display: flex;
    gap: 8px;
  }
  
  /* Permissions modal styling */
  .permissions-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  
  .permission-all-hosts {
    margin-bottom: 16px;
  }
  
  .host-selection-container {
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    margin-top: 16px;
    padding-left: 15px;
  }
  
  .host-selection,
  .group-selection {
    padding: 16px;
  }
  
  .selection-stats {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 13px;
    color: #666;
  }
  
  .selection-actions {
    display: flex;
    gap: 8px;
  }
  
  .host-checkbox-group,
  .group-checkbox-group {
    display: flex;
    flex-direction: column;
    max-height: 300px;
    overflow-y: auto;
  }
  
  .host-item,
  .group-item {
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.3s;
  }
  
  .host-item:hover,
  .group-item:hover {
    background-color: #f0f0f0;
  }
  
  .host-info {
    display: flex;
    align-items: center;
  }
  
  .host-name {
    margin-right: 8px;
  }
  
  .host-group-tag {
    font-size: 12px;
    background-color: #e6f7ff;
    color: #1890ff;
    padding: 2px 8px;
    border-radius: 4px;
  }
  
  .group-info {
    display: flex;
    flex-direction: column;
  }
  
  .group-name {
    font-weight: bold;
  }
  
  .group-description {
    font-size: 12px;
    color: #666;
  }
  
  .host-count {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }
  </style>