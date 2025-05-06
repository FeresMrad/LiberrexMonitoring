<!-- src/components/AddRuleForm.vue -->
<template>
    <div>
      <!-- Rule Form Modal -->
      <a-modal
        v-model:open="modalVisible"
        :title="isEditing ? 'Edit Alert Rule' : 'Add Alert Rule'"
        @ok="handleModalOk"
        @cancel="handleModalCancel"
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
    </div>
  </template>
  
  <script setup>
  import { ref, watch, defineProps, defineEmits, defineExpose } from 'vue';
  import { message } from 'ant-design-vue';
  import api from '@/services/api';
  
  // Define props
  const props = defineProps({
    // Optional initial rule for editing
    rule: {
      type: Object,
      default: null
    }
  });
  
  // Define emits
  const emit = defineEmits([
    'saved', // When a rule is saved (created or updated)
    'cancel' // When the modal is canceled
  ]);
  
  // Reactive state
  const modalVisible = ref(false);
  const formLoading = ref(false);
  const isEditing = ref(false);
  const ruleFormRef = ref(null);
  const currentRuleId = ref(null);
  
  // Form state
  const ruleForm = ref({
    name: '',
    description: '',
    metric_type: 'cpu.percent',
    comparison: 'above',
    threshold: 80
  });
  
  // Hosts data for specific targeting
  const availableHosts = ref([]);
  const hostsLoading = ref(false);
  const selectedHosts = ref([]);
  const targetSelection = ref('all');
  
  // Form validation rules
  const ruleFormRules = {
    name: [{ required: true, message: 'Please input rule name', trigger: 'blur' }],
    metric_type: [{ required: true, message: 'Please select a metric', trigger: 'change' }],
    comparison: [{ required: true, message: 'Please select a comparison', trigger: 'change' }],
    threshold: [{ required: true, message: 'Please input a threshold', trigger: 'change' }]
  };
  
  // Watch for changes in the rule prop
  watch(() => props.rule, (newRule) => {
    if (newRule) {
      setRuleForEditing(newRule);
    }
  });
  
  // Set rule data for editing
  const setRuleForEditing = (rule) => {
    if (!rule) return;
    
    // Store the rule ID
    currentRuleId.value = rule.id;
    
    // Update form with rule data
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
      
      // Set selected hosts
      selectedHosts.value = rule.targets
        .filter(target => target.target_type === 'host')
        .map(target => target.target_id);
      
      // Make sure we have hosts loaded
      if (availableHosts.value.length === 0) {
        fetchAvailableHosts();
      }
    }
    
    isEditing.value = true;
  };
  
  // Handle target selection change
  const handleTargetChange = (e) => {
    const value = e.target.value;
    targetSelection.value = value;
    
    if (value === 'specific' && availableHosts.value.length === 0) {
      fetchAvailableHosts();
    }
  };
  
  // Check if targets include wildcard (all hosts)
  const hasWildcardTarget = (targets) => {
    return targets && targets.some(target => target.target_type === 'all' || target.target_id === '*');
  };
  
  // Reset form to default values
  const resetForm = () => {
    ruleForm.value = {
      name: '',
      description: '',
      metric_type: 'cpu.percent',
      comparison: 'above',
      threshold: 80
    };
    targetSelection.value = 'all';
    selectedHosts.value = [];
    currentRuleId.value = null;
    isEditing.value = false;
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
  
  // Handle form submission
  const handleModalOk = async () => {
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
      
      let result;
      
      if (isEditing.value && currentRuleId.value) {
        // Update existing rule
        result = await api.updateAlertRule(currentRuleId.value, ruleData);
        message.success('Alert rule updated successfully');
      } else {
        // Create new rule
        result = await api.createAlertRule(ruleData);
        message.success('Alert rule created successfully');
      }
      
      // Emit saved event
      emit('saved', result);
      
      // Close modal and reset form
      modalVisible.value = false;
      resetForm();
    } catch (error) {
      console.error('Error saving alert rule:', error);
      message.error(error.response?.data?.error || 'Failed to save alert rule');
    } finally {
      formLoading.value = false;
    }
  };
  
  // Handle modal cancel
  const handleModalCancel = () => {
    modalVisible.value = false;
    resetForm();
    emit('cancel');
  };
  
  // Method to open the modal (for new rule)
  const showModal = () => {
    resetForm();
    modalVisible.value = true;
  };
  
  // Method to open the modal for editing a specific rule
  const showModalForEdit = (rule) => {
    if (rule) {
      setRuleForEditing(rule);
      modalVisible.value = true;
    }
  };
  
  // Expose methods to parent component
  defineExpose({
    showModal,
    showModalForEdit
  });
  </script>