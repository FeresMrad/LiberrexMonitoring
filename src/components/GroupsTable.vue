<template>
    <div class="groups-table-container">
      <!-- Groups Table -->
      <a-table 
        :columns="columns" 
        :data-source="groups" 
        :loading="loading"
        rowKey="id"
      >
        <template #bodyCell="{ column, record }">
          <!-- Hosts Column - Show host list directly -->
          <template v-if="column.key === 'hosts'">
            <div class="hosts-preview">
              <div v-if="record.hosts.length > 0" class="host-list">
                <a-tooltip title="Manage hosts">
                  <div class="hosts-summary" @click="showHostsModal(record)">
                    {{ formatHostList(record.hosts) }}
                  </div>
                </a-tooltip>
              </div>
              <div v-else class="no-hosts">
                No hosts assigned
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
                  :disabled="record.id === 'default'"
                >
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </div>
          </template>
        </template>
      </a-table>
  
      <!-- Hosts Management Modal -->
      <a-modal
        v-model:open="hostsModalVisible"
        :title="`Manage Hosts for ${selectedGroup?.name || ''}`"
        @ok="handleHostsModalOk"
        @cancel="handleHostsModalCancel"
        :width="700"
        :footer="null"
      >
        <div v-if="selectedGroup" class="hosts-management">
          <div class="hosts-transfer">
            <a-transfer
              v-model:targetKeys="selectedHostKeys"
              :dataSource="allHostsDataSource"
              :titles="['Available Hosts', 'Group Hosts']"
              :render="item => item.title"
              :disabled="hostTransferLoading"
              @change="handleTransferChange"
            />
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
    TeamOutlined 
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import api from '@/services/api';
  
  
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
  
  // Table columns - removed color column
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
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
      sorter: (a, b) => a.hosts.length - b.hosts.length
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
    try {
      const response = await api.getHosts();
      allHosts.value = response.data;
      
      // Format hosts for the transfer component
      allHostsDataSource.value = allHosts.value.map(host => ({
        key: host.name,
        title: host.customName || host.name,
        description: host.ip
      }));
    } catch (error) {
      console.error('Error fetching hosts:', error);
      message.error('Failed to load hosts');
    }
  };
  
  // Format host list for display - modified to always show all hosts
  const formatHostList = (hostIds) => {
    if (!hostIds || hostIds.length === 0) return 'No hosts';
    
    // Get host names from ids
    const hostNames = hostIds.map(id => {
      const host = allHosts.value.find(h => h.name === id);
      return host ? (host.customName || host.name) : id;
    });
    
    // Show all hosts directly
    return hostNames.join(', ');
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
    if (record.id === 'default') {
      message.warning('The default group cannot be deleted');
      return;
    }
    
    if (deleteHandler) {
      deleteHandler(record);
    }
  };
  
  // Show hosts management modal
  const showHostsModal = (group) => {
    selectedGroup.value = group;
    selectedHostKeys.value = [...group.hosts];
    hostsModalVisible.value = true;
    
    // Ensure hosts are loaded
    fetchHosts();
  };
  
  // Handle host transfer change
  const handleTransferChange = (nextTargetKeys) => {
    selectedHostKeys.value = nextTargetKeys;
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
  }
  
  .no-hosts {
    color: #999;
    font-style: italic;
  }
  
  .hosts-summary {
    cursor: pointer;
    color: #1890ff;
    text-decoration: underline dotted;
  }
  
  .hosts-transfer {
    margin-bottom: 20px;
  }
  
  .hosts-modal-footer {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  </style>