<!-- src/components/RulesTable.vue -->
<template>
    <div class="rules-table-container">
      <!-- Rules Table -->
      <a-table
        :columns="columns"
        :data-source="rules"
        :loading="loading"
        rowKey="id"
        :pagination="{ pageSize: 10 }"
      >
        <!-- Enabled Column -->
        <template #bodyCell="{ column, text, record }">
          <template v-if="column.key === 'enabled'">
            <a-switch
              :checked="text"
              @change="(checked) => toggleRuleStatus(record.id, checked)"
              :loading="toggleLoading === record.id"
            />
          </template>
          
          <!-- Threshold Column -->
          <template v-else-if="column.key === 'threshold'">
            <span>
              {{ record.comparison === 'above' ? '>' : 
                 record.comparison === 'below' ? '<' : '=' }}
              {{ text }}
            </span>
          </template>
          
          <!-- Metric Type Column -->
          <template v-else-if="column.key === 'metric_type'">
            <a-tag color="blue">{{ formatMetricType(text) }}</a-tag>
          </template>
          
          <!-- Targets Column -->
          <template v-else-if="column.key === 'targets'">
            <span v-if="hasWildcardTarget(record.targets)">All Hosts</span>
            <span v-else>{{ record.targets.length }} targets</span>
          </template>
          
          <!-- Actions Column -->
          <template v-else-if="column.key === 'actions'">
            <a-space>
                <a-button type="primary" size="small" @click="editRule(record)">
                <template #icon>
                    <EditOutlined />
                </template>
                </a-button>
                <a-button
                type="danger"
                size="small"
                @click="deleteRule(record.id)"
                >
                <template>
                    <DeleteOutlined />
                </template>
                </a-button>
            </a-space>
            </template>

        </template>
      </a-table>
  
      <!-- Delete Confirmation Modal -->
      <a-modal
        v-model:open="deleteModalVisible"
        title="Delete Rule"
        @ok="confirmDeleteRule"
        @cancel="cancelDeleteRule"
        :confirmLoading="deleteLoading"
        okType="danger"
        okText="Delete"
      >
        <div v-if="ruleToDelete">
          <p>Are you sure you want to delete the rule <strong>{{ ruleToDelete.name }}</strong>?</p>
          <p>This action cannot be undone.</p>
        </div>
      </a-modal>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, defineProps, defineEmits, defineExpose } from 'vue';
  import { 
    EditOutlined, 
    DeleteOutlined 
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import api from '@/services/api';
  
  // Define props
  const props = defineProps({
    // Optional initial data
    initialRules: {
      type: Array,
      default: () => []
    }
  });
  
  // Define emits
  const emit = defineEmits([
    'edit', // When user clicks edit button
    'refresh' // When table data changes (toggle, delete)
  ]);
  
  // Reactive state
  const rules = ref(props.initialRules);
  const loading = ref(true);
  const toggleLoading = ref(null);
  
  // Delete state
  const deleteModalVisible = ref(false);
  const deleteLoading = ref(false);
  const ruleToDelete = ref(null);
  
  // Table columns
  const columns = [
    {
      title: 'Rule Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'Metric',
      dataIndex: 'metric_type',
      key: 'metric_type',
      width: 140,
      filters: [
        { text: 'CPU', value: 'cpu.percent' },
        { text: 'Memory', value: 'memory.percent' },
        { text: 'Disk', value: 'disk.percent' }
      ],
      onFilter: (value, record) => record.metric_type === value
    },
    {
      title: 'Threshold',
      dataIndex: 'threshold',
      key: 'threshold',
      width: 100
    },
    {
      title: 'Targets',
      key: 'targets',
      width: 100
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 90
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
    }
  ];
  
  // Format metric type for display
  const formatMetricType = (metricType) => {
    return metricType.replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  };
  
  // Check if targets include wildcard (all hosts)
  const hasWildcardTarget = (targets) => {
    return targets.some(target => target.target_type === 'all' || target.target_id === '*');
  };
  
  // Edit a rule
  const editRule = (rule) => {
    emit('edit', rule);
  };
  
  // Show delete confirmation
  const deleteRule = (rule) => {
    ruleToDelete.value = rules.value.find(r => r.id === rule);
    deleteModalVisible.value = true;
  };
  
  // Confirm delete
  const confirmDeleteRule = async () => {
    if (!ruleToDelete.value) return;
    
    deleteLoading.value = true;
    
    try {
      await api.deleteAlertRule(ruleToDelete.value.id);
      
      // Remove rule from local state
      rules.value = rules.value.filter(rule => rule.id !== ruleToDelete.value.id);
      
      message.success('Rule deleted successfully');
      emit('refresh');
      deleteModalVisible.value = false;
    } catch (error) {
      console.error('Error deleting rule:', error);
      message.error('Failed to delete rule');
    } finally {
      deleteLoading.value = false;
      ruleToDelete.value = null;
    }
  };
  
  // Cancel delete
  const cancelDeleteRule = () => {
    deleteModalVisible.value = false;
    ruleToDelete.value = null;
  };
  
  // Toggle rule status (enabled/disabled)
  const toggleRuleStatus = async (ruleId, enabled) => {
    toggleLoading.value = ruleId;
    
    try {
      await api.updateAlertRule(ruleId, { enabled });
      
      // Update local state
      const ruleIndex = rules.value.findIndex(rule => rule.id === ruleId);
      if (ruleIndex !== -1) {
        rules.value[ruleIndex].enabled = enabled;
      }
      
      message.success(`Rule ${enabled ? 'enabled' : 'disabled'} successfully`);
      emit('refresh');
    } catch (error) {
      console.error('Error toggling rule status:', error);
      message.error('Failed to update rule status');
    } finally {
      toggleLoading.value = null;
    }
  };
  
  // Fetch alert rules
  const fetchRules = async () => {
    loading.value = true;
    
    try {
      const response = await api.getAlertRules();
      rules.value = response.data;
    } catch (error) {
      console.error('Error fetching alert rules:', error);
      message.error('Failed to load alert rules');
    } finally {
      loading.value = false;
    }
  };
  
  // Lifecycle hooks
  onMounted(() => {
    fetchRules();
  });
  
  // Expose methods to parent component
  defineExpose({
    fetchRules
  });
  </script>
  
  <style scoped>
  .rules-table-container {
    width: 100%;
  }
  </style>