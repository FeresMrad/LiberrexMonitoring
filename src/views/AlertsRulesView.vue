<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="rules-container">
          <div class="header-row">
            <h2>Alert Rules</h2>
            <a-button type="primary" @click="showAddRuleModal">
              <template #icon><PlusOutlined /></template>
              Add Rule
            </a-button>
          </div>
  
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
                    <template #icon><EditOutlined /></template>
                  </a-button>
                  <a-popconfirm
                    title="Are you sure you want to delete this rule?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="deleteRule(record.id)"
                  >
                    <a-button type="danger" size="small">
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
        
        <!-- Rule Form Modal -->
        <a-modal
          v-model:open="ruleModalVisible"
          :title="editingRule ? 'Edit Alert Rule' : 'Add Alert Rule'"
          @ok="handleRuleModalOk"
          :confirmLoading="formLoading"
          width="700px"
        >
          <a-form
            :model="ruleForm"
            :rules="ruleFormRules"
            layout="vertical"
            ref="ruleFormRef"
          >
            <a-form-item label="Rule Name" name="name">
              <a-input v-model:value="ruleForm.name" placeholder="CPU High Usage Alert" />
            </a-form-item>
            
            <a-form-item label="Description" name="description">
              <a-textarea v-model:value="ruleForm.description" placeholder="Alert when CPU usage is high" />
            </a-form-item>
            
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="Metric" name="metric_type">
                  <a-select v-model:value="ruleForm.metric_type">
                    <a-select-option value="cpu.percent">CPU Usage (%)</a-select-option>
                    <a-select-option value="memory.percent">Memory Usage (%)</a-select-option>
                    <a-select-option value="disk.percent">Disk Usage (%)</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="Comparison" name="comparison">
                  <a-select v-model:value="ruleForm.comparison">
                    <a-select-option value="above">Above</a-select-option>
                    <a-select-option value="below">Below</a-select-option>
                    <a-select-option value="equal">Equal to</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              
              <a-col :span="12">
                <a-form-item label="Threshold" name="threshold">
                  <a-input-number 
                    v-model:value="ruleForm.threshold" 
                    :min="0" 
                    :max="100" 
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            
            <a-divider>Target Hosts</a-divider>
            
            <a-form-item label="Target Selection" name="target_selection">
              <a-radio-group v-model:value="targetSelection" @change="handleTargetChange">
                <a-radio value="all">All Hosts</a-radio>
                <a-radio value="specific">Specific Hosts</a-radio>
              </a-radio-group>
            </a-form-item>
            
            <a-form-item v-if="targetSelection === 'specific'" label="Select Hosts" name="selected_hosts">
              <a-select 
                v-model:value="selectedHosts" 
                mode="multiple" 
                placeholder="Select hosts"
                style="width: 100%"
                :loading="hostsLoading"
              >
                <a-select-option v-for="host in availableHosts" :key="host.id" :value="host.id">
                  {{ host.displayName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-form>
        </a-modal>
      </HiHello>
    </a-layout>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { 
    PlusOutlined, 
    EditOutlined, 
    DeleteOutlined 
  } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import HiHello from "@/components/HiHello.vue";
  import api from '@/services/api';
  import authService from '@/services/auth';
  
  // Reactive state
  const rules = ref([]);
  const loading = ref(true);
  const ruleModalVisible = ref(false);
  const formLoading = ref(false);
  const editingRule = ref(false);
  const currentRuleId = ref(null);
  const toggleLoading = ref(null);
  
  // Hosts data for specific targeting
  const availableHosts = ref([]);
  const hostsLoading = ref(false);
  const selectedHosts = ref([]);
  const targetSelection = ref('all');
  
  // Form state
  const ruleFormRef = ref(null);
  const ruleForm = ref({
    name: '',
    description: '',
    metric_type: 'cpu.percent',
    comparison: 'above',
    threshold: 80
  });
  
  // Form validation rules
  const ruleFormRules = {
    name: [{ required: true, message: 'Please input rule name', trigger: 'blur' }],
    metric_type: [{ required: true, message: 'Please select a metric', trigger: 'change' }],
    comparison: [{ required: true, message: 'Please select a comparison', trigger: 'change' }],
    threshold: [{ required: true, message: 'Please input a threshold', trigger: 'change' }]
  };
  
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
      fixed: 'right'
    }
  ];
  
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
  
  // Format metric type for display
  const formatMetricType = (metricType) => {
    return metricType.replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  };
  
  // Check if targets include wildcard (all hosts)
  const hasWildcardTarget = (targets) => {
    return targets.some(target => target.target_type === 'all' || target.target_id === '*');
  };
  
  // Show modal to add a new rule
  const showAddRuleModal = async () => {
    editingRule.value = false;
    currentRuleId.value = null;
    targetSelection.value = 'all';
    selectedHosts.value = [];
    
    // Reset form to default values
    ruleForm.value = {
      name: '',
      description: '',
      metric_type: 'cpu.percent',
      comparison: 'above',
      threshold: 80
    };
    
    // Fetch hosts for targeting
    await fetchAvailableHosts();
    
    ruleModalVisible.value = true;
  };
  
  // Edit an existing rule
  const editRule = async (rule) => {
    editingRule.value = true;
    currentRuleId.value = rule.id;
    
    // Populate form with rule data
    ruleForm.value = {
      name: rule.name,
      description: rule.description || '',
      metric_type: rule.metric_type,
      comparison: rule.comparison,
      threshold: rule.threshold
    };
    
    // Determine target selection mode
    if (hasWildcardTarget(rule.targets)) {
      targetSelection.value = 'all';
      selectedHosts.value = [];
    } else {
      targetSelection.value = 'specific';
      
      // Fetch hosts first to ensure options are available
      await fetchAvailableHosts();
      
      // Set selected hosts
      selectedHosts.value = rule.targets
        .filter(target => target.target_type === 'host')
        .map(target => target.target_id);
    }
    
    ruleModalVisible.value = true;
  };
  
  // Delete a rule
  const deleteRule = async (ruleId) => {
    try {
      await api.deleteAlertRule(ruleId);
      
      // Remove rule from local state
      rules.value = rules.value.filter(rule => rule.id !== ruleId);
      
      message.success('Rule deleted successfully');
    } catch (error) {
      console.error('Error deleting rule:', error);
      message.error('Failed to delete rule');
    }
  };
  
  // Fetch available hosts for targeting
  const fetchAvailableHosts = async () => {
    if (availableHosts.value.length > 0) return; // Already fetched
    
    hostsLoading.value = true;
    
    try {
      const response = await api.getHosts();
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
  
  // Handle target selection change
  const handleTargetChange = (e) => {
    const value = e.target.value;
    targetSelection.value = value;
    
    if (value === 'specific' && availableHosts.value.length === 0) {
      fetchAvailableHosts();
    }
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
    } catch (error) {
      console.error('Error toggling rule status:', error);
      message.error('Failed to update rule status');
    } finally {
      toggleLoading.value = null;
    }
  };
  
  // Handle form submission
  const handleRuleModalOk = async () => {
    try {
      // Validate form
      await ruleFormRef.value.validate();
      
      formLoading.value = true;
      
      // Prepare targets based on selection
      let targets = [];
      if (targetSelection.value === 'all') {
        targets = [{ type: 'all', id: '*' }];
      } else {
        targets = selectedHosts.value.map(hostId => ({ type: 'host', id: hostId }));
      }
      
      // Create data object
      const ruleData = {
        name: ruleForm.value.name,
        description: ruleForm.value.description,
        metric_type: ruleForm.value.metric_type,
        comparison: ruleForm.value.comparison,
        threshold: ruleForm.value.threshold,
        targets: targets
      };
      
      if (editingRule.value) {
        // Update existing rule
        await api.updateAlertRule(currentRuleId.value, ruleData);
        message.success('Alert rule updated successfully');
      } else {
        // Create new rule
        await api.createAlertRule(ruleData);
        message.success('Alert rule created successfully');
      }
      
      // Close modal and refresh rules
      ruleModalVisible.value = false;
      fetchRules();
    } catch (error) {
      console.error('Error saving alert rule:', error);
      message.error(error.response?.data?.error || 'Failed to save alert rule');
    } finally {
      formLoading.value = false;
    }
  };
  
  // Lifecycle hooks
  onMounted(() => {
    // Check if user is admin
    if (!authService.isAdmin()) {
      message.error('You do not have permission to access this page');
      return;
    }
    
    // Fetch initial data
    fetchRules();
  });
  </script>
  
  <style scoped>
  .rules-container {
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