<template>
    <div class="groups-table-container">
      <!-- Groups Table -->
      <a-table 
        :columns="columns" 
        :data-source="groups" 
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <!-- Hosts Column - Show host list with clickable hosts -->
          <template v-if="column.key === 'hosts'">
            <div class="hosts-preview">
              <div v-if="record.hosts.length > 0" class="host-list">
                <span v-for="(hostId, index) in record.hosts" :key="hostId" class="host-item">
                  <a @click.stop="redirectToHost(hostId)" class="host-link">
                    {{ getHostDisplayName(hostId) }}
                  </a>
                  <span v-if="index < record.hosts.length - 1"> </span>
                </span>
                <a-button 
                  type="link" 
                  size="small" 
                  @click.stop="showHostsModal(record)" 
                  class="manage-hosts-btn"
                >
                </a-button>
              </div>
              <div v-else class="no-hosts">
                <a-button type="link" @click="showHostsModal(record)">
                  Add hosts
                </a-button>
              </div>
            </div>
          </template>
  
          <!-- Actions Column -->
          <template v-if="column.key === 'actions'">
            <div class="action-buttons">
              <a-tooltip title="Edit Group">
                <a-button 
                  type="default" 
                  size="small" 
                  @click="handleEdit(record)"
                >
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Manage Hosts">
                <a-button 
                  type="default" 
                  size="small" 
                  @click="showHostsModal(record)"
                >
                  <template #icon><TeamOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Delete Group">
                <a-button 
                  type="default" 
                  size="small" 
                  @click="handleDelete(record)"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
  
      <!-- Improved Hosts Management Modal -->
      <a-modal
        v-model:open="hostsModalVisible"
        :title="`Manage Hosts for ${selectedGroup?.name || ''}`"
        :width="700"
        :footer="null"
      >
        <div v-if="selectedGroup" class="hosts-management">
          <!-- Search input for filtering hosts -->
          <div class="search-container">
            <a-input-search
              v-model:value="hostSearchText"
              placeholder="Search hosts"
              style="width: 100%; margin-bottom: 16px"
              @change="filterHosts"
            />
          </div>
          
          <!-- Host selection panel -->
          <div class="host-selection-panel">
            <div class="selection-header">
              <div class="selection-title">Available Hosts</div>
              <a-button 
                type="link" 
                @click="selectAllHosts" 
                :disabled="filteredHosts.length === 0"
              >
                Select All
              </a-button>
            </div>
            
            <a-spin :spinning="hostsLoading">
              <div v-if="filteredHosts.length > 0" class="hosts-list-container">
                <a-checkbox-group v-model:value="selectedHostKeys" class="hosts-list">
                  <div v-for="host in filteredHosts" :key="host.key" class="host-item">
                    <a-checkbox :value="host.key">
                      <div class="host-info">
                        <div class="host-name">{{ host.title }}</div>
                        <div class="host-ip">{{ host.description }}</div>
                      </div>
                    </a-checkbox>
                  </div>
                </a-checkbox-group>
              </div>
              <a-empty v-else description="No hosts found" />
            </a-spin>
          </div>
          
          <div class="hosts-modal-footer">
            <a-button @click="handleHostsModalCancel">Cancel</a-button>
            <a-button 
              type="primary" 
              @click="handleHostsModalOk" 
              :loading="hostTransferLoading"
            >
              Save
            </a-button>
          </div>
        </div>
      </a-modal>
    </div>
  </template>
  
  <script setup>
  import { ref, defineExpose, onMounted } from 'vue';
  import { 
    EditOutlined, 
    DeleteOutlined, 
    TeamOutlined,
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import { useRouter } from 'vue-router';
  import api from '@/services/api';
    
  // Initialize router
  const router = useRouter();
  
  // Table data
  const groups = ref([]);
  const loading = ref(true);
  
  // Edit/Delete handlers provided by parent
  let editHandler = null;
  let deleteHandler = null;
  
  // Hosts modal state
  const hostsModalVisible = ref(false);
  const selectedGroup = ref(null);
  const allHosts = ref([]);
  const selectedHostKeys = ref([]);
  const allHostsDataSource = ref([]);
  const hostTransferLoading = ref(false);
  const hostsLoading = ref(false);
  
  // Search state
  const hostSearchText = ref('');
  const filteredHosts = ref([]);
  
  // Table columns
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Hosts',
      dataIndex: 'hosts',
      key: 'hosts',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      align: 'center'
    }
  ];
  
  // Fetch all groups from the API
  const fetchGroups = async () => {
    loading.value = true;
    try {
      const response = await api.getGroups();
      groups.value = response.data;
    } catch (error) {
      console.error('Error fetching groups:', error);
      message.error('Failed to load groups');
    } finally {
      loading.value = false;
    }
  };
  
  // Fetch all hosts for host management
  const fetchHosts = async () => {
    hostsLoading.value = true;
    try {
      const response = await api.getHosts();
      allHosts.value = response.data;
      
      // Format hosts for the component
      allHostsDataSource.value = allHosts.value.map(host => ({
        key: host.name,
        title: host.customName || host.name,
        description: host.ip || 'No IP'
      }));
      
      // Initialize filtered hosts
      filterHosts();
    } catch (error) {
      console.error('Error fetching hosts:', error);
      message.error('Failed to load hosts');
    } finally {
      hostsLoading.value = false;
    }
  };
  
  // Get the display name for a host ID
  const getHostDisplayName = (hostId) => {
    const host = allHosts.value.find(h => h.name === hostId);
    return host ? (host.customName || host.name) : hostId;
  };
  
  // Redirect to host metrics view
  const redirectToHost = (hostId) => {
    router.push(`/entities/${hostId}`);
  };
  
  // Set external edit handler
  const setEditHandler = (handler) => {
    editHandler = handler;
  };
  
  // Set external delete handler
  const setDeleteHandler = (handler) => {
    deleteHandler = handler;
  };
  
  // Handle edit button click
  const handleEdit = (record) => {
    if (editHandler) {
      editHandler(record);
    }
  };
  
  // Handle delete button click
  const handleDelete = (record) => {
    
    if (deleteHandler) {
      deleteHandler(record);
    }
  };
  
  // Show hosts management modal
  const showHostsModal = (group) => {
    selectedGroup.value = group;
    selectedHostKeys.value = [...group.hosts];
    hostsModalVisible.value = true;
    hostSearchText.value = '';
    
    // Ensure hosts are loaded
    fetchHosts();
  };
  
  // Filter hosts based on search text
  const filterHosts = () => {
    if (!hostSearchText.value) {
      filteredHosts.value = [...allHostsDataSource.value];
      return;
    }
    
    const searchLower = hostSearchText.value.toLowerCase();
    filteredHosts.value = allHostsDataSource.value.filter(host => 
      host.title.toLowerCase().includes(searchLower) || 
      host.description.toLowerCase().includes(searchLower)
    );
  };
  
  // Select all visible hosts
  const selectAllHosts = () => {
    // Get keys of all currently filtered hosts
    const allFilteredKeys = filteredHosts.value.map(host => host.key);
    
    // If all filtered hosts are already selected, deselect them
    const allFilteredAreSelected = allFilteredKeys.every(key => 
      selectedHostKeys.value.includes(key)
    );
    
    if (allFilteredAreSelected) {
      // Remove all filtered hosts from selection
      selectedHostKeys.value = selectedHostKeys.value.filter(key => 
        !allFilteredKeys.includes(key)
      );
    } else {
      // Add all filtered hosts to selection (avoiding duplicates)
      const newSelection = new Set([...selectedHostKeys.value, ...allFilteredKeys]);
      selectedHostKeys.value = Array.from(newSelection);
    }
  };
  
  // Handle hosts modal OK button
  const handleHostsModalOk = async () => {
    if (!selectedGroup.value) return;
    
    hostTransferLoading.value = true;
    
    try {
      // Compare current and selected hosts to determine changes
      const currentHosts = new Set(selectedGroup.value.hosts);
      const newHosts = new Set(selectedHostKeys.value);
      
      // Hosts to add (in newHosts but not in currentHosts)
      const hostsToAdd = [...newHosts].filter(hostId => !currentHosts.has(hostId));
      
      // Hosts to remove (in currentHosts but not in newHosts)
      const hostsToRemove = [...currentHosts].filter(hostId => !newHosts.has(hostId));
      
      // Process additions and removals
      const promises = [
        // Add hosts
        ...hostsToAdd.map(hostId => 
          api.addHostToGroup(selectedGroup.value.id, hostId)
        ),
        // Remove hosts
        ...hostsToRemove.map(hostId => 
          api.removeHostFromGroup(selectedGroup.value.id, hostId)
        )
      ];
      
      await Promise.all(promises);
      
      // Update local group data
      selectedGroup.value.hosts = [...selectedHostKeys.value];
      
      // Refresh the table
      fetchGroups();
      
      message.success('Host assignments updated successfully');
      hostsModalVisible.value = false;
    } catch (error) {
      console.error('Error updating host assignments:', error);
      message.error('Failed to update host assignments');
    } finally {
      hostTransferLoading.value = false;
    }
  };
  
  // Handle hosts modal cancel
  const handleHostsModalCancel = () => {
    hostsModalVisible.value = false;
    selectedGroup.value = null;
    selectedHostKeys.value = [];
    hostSearchText.value = '';
  };
  
  // Lifecycle hooks
  onMounted(() => {
    fetchGroups();
    fetchHosts();
  });
  
  // Expose functions to parent component
  defineExpose({
    fetchGroups,
    setEditHandler,
    setDeleteHandler
  });
  </script>
  
  <style scoped>
  .groups-table-container {
    width: 100%;
  }
  
  .action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  
  .hosts-preview {
    display: flex;
    flex-direction: column;
  }
  
  .host-list {
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .no-hosts {
    color: #999;
    font-style: italic;
  }
  
  .host-link {
    color: #1890ff;
    cursor: pointer;
  }
  
  .host-link:hover {
    text-decoration: underline;
  }
  
  .manage-hosts-btn {
    padding: 0 4px;
    margin-left: 8px;
  }
  
  /* Host selection styles */
  .host-selection-panel {
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    padding: 16px;
    margin-bottom: 16px;
    background-color: #fafafa;
  }
  
  .selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
  
  .selection-title {
    font-weight: bold;
    color: rgba(0, 0, 0, 0.85);
  }
  
  .hosts-list-container {
    max-height: 300px;
    overflow-y: auto;
    padding-right: 8px;
    margin-bottom: 8px;
  }
  
  .hosts-list {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  .host-item {
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.3s;
  }
  
  .host-item:hover {
    background-color: #f0f0f0;
  }
  
  .host-info {
    display: flex;
    flex-direction: column;
    margin-left: 4px;
  }
  
  .host-name {
    font-weight: 500;
  }
  
  .host-ip {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
  
  .hosts-modal-footer {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  </style>