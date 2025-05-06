<template>
    <a-layout style="min-height: 100vh">
      <HiHello>
        <div class="alerts-container">
          <div class="header-row">
            <h2 class="page-title">Alert Events</h2>
            
            <div class="header-actions">
              <!-- View Rules button (for admins) -->
              <a-button v-if="isAdmin" type="default" @click="navigateToRules" style="margin-right: 10px;">
                <template #icon><SettingOutlined /></template>
                Manage Rules
              </a-button>
              
              <!-- Add Rule button (for admins) -->
              <a-button v-if="isAdmin" type="primary" @click="showAddRuleModal">
                <template #icon><PlusOutlined /></template>
                Add Rule
              </a-button>
            </div>
          </div>
          
          <!-- Status filter -->
          <div class="filters">
            <a-radio-group v-model:value="statusFilter" @change="fetchAlerts">
              <a-radio-button value="all">All</a-radio-button>
              <a-radio-button value="triggered">Active</a-radio-button>
              <a-radio-button value="acknowledged">Acknowledged</a-radio-button>
              <a-radio-button value="resolved">Resolved</a-radio-button>
            </a-radio-group>
            
            <!-- Host filter - only show if there are alerts from multiple hosts -->
            <a-select
              v-if="uniqueHosts.length > 1"
              v-model:value="hostFilter"
              style="width: 200px; margin-left: 16px;"
              placeholder="All Hosts"
              allowClear
              @change="fetchAlerts"
            >
              <a-select-option v-for="host in uniqueHosts" :key="host" :value="host">
                {{ host }}
              </a-select-option>
            </a-select>
          </div>
          
          <!-- Alert list -->
          <a-table
            :columns="columns"
            :data-source="alerts"
            :loading="loading"
            rowKey="id"
            :pagination="{ pageSize: 10 }"
          >
            <!-- Severity column -->
            <template #bodyCell="{ column, text, record }">
              <template v-if="column.key === 'severity'">
                <a-tag :color="getSeverityColor(text)">{{ text.toUpperCase() }}</a-tag>
              </template>
              
              <!-- Status column -->
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getStatusColor(text)">{{ text }}</a-tag>
              </template>
              
              <!-- Time column -->
              <template v-else-if="column.key === 'time'">
                {{ formatTime(record.triggered_at) }}
              </template>
              
              <!-- Actions column -->
              <template v-else-if="column.key === 'actions'">
                <a-button 
                  v-if="record.status === 'triggered'" 
                  size="small" 
                  type="primary"
                  @click="acknowledgeAlert(record.id)"
                >
                  Acknowledge
                </a-button>
                <span v-else-if="record.status === 'acknowledged'">
                  Acknowledged by {{ record.acknowledged_by || 'Unknown' }}
                </span>
                <span v-else-if="record.status === 'resolved'">
                  Resolved at {{ formatTime(record.resolved_at) }}
                </span>
              </template>
            </template>
          </a-table>
        </div>
      </HiHello>
      
      <!-- Add Rule Modal -->
      <a-modal
        v-model:open="addRuleModalVisible"
        title="Add Alert Rule"
        @ok="handleAddRule"
        :confirmLoading="addingRule"
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
            
            <a-col :span="12">
              <a-form-item label="Severity" name="severity">
                <a-select v-model:value="ruleForm.severity">
                  <a-select-option value="info">Info</a-select-option>
                  <a-select-option value="warning">Warning</a-select-option>
                  <a-select-option value="critical">Critical</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="Comparison" name="comparison">
                <a-select v-model:value="ruleForm.comparison">
                  <a-select-option value="above">Above</a-select-option>
                  <a-select-option value="below">Below</a-select-option>
                  <a-select-option value="equal">Equal to</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            
            <a-col :span="8">
              <a-form-item label="Threshold" name="threshold">
                <a-input-number 
                  v-model:value="ruleForm.threshold" 
                  :min="0" 
                  :max="100" 
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            
            <a-col :span="8">
              <a-form-item label="Duration (minutes)" name="duration_minutes">
                <a-input-number 
                  v-model:value="ruleForm.duration_minutes" 
                  :min="0" 
                  :max="60" 
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          
          <a-divider>Notification Settings</a-divider>
          
          <a-form-item label="Email Notifications" name="email_enabled">
            <a-switch v-model:checked="ruleForm.notifications.email_enabled" />
          </a-form-item>
          
          <a-form-item 
            v-if="ruleForm.notifications.email_enabled" 
            label="Email Recipients" 
            name="email_recipients"
          >
            <a-input 
              v-model:value="ruleForm.notifications.email_recipients" 
              placeholder="admin@example.com, user@example.com" 
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-layout>
  </template>
  
  <script setup>
  import { ref, onMounted, computed } from 'vue';
  import { useRouter } from 'vue-router';
  import { PlusOutlined, SettingOutlined } from '@ant-design/icons-vue';
  import { message } from 'ant-design-vue';
  import HiHello from "@/components/HiHello.vue";
  import api from '@/services/api';
  import authService from '@/services/auth';
  
  // Router for navigation
  const router = useRouter();
  
  // Reactive state
  const alerts = ref([]);
  const loading = ref(true);
  const statusFilter = ref('all');
  const hostFilter = ref(null);
  const addRuleModalVisible = ref(false);
  const addingRule = ref(false);
  const ruleFormRef = ref(null);
  
  // Form state
  const ruleForm = ref({
    name: '',
    description: '',
    metric_type: 'cpu.percent',
    comparison: 'above',
    threshold: 80,
    duration_minutes: 5,
    severity: 'warning',
    notifications: {
      email_enabled: false,
      email_recipients: ''
    }
  });
  
  // Form validation rules
  const ruleFormRules = {
    name: [{ required: true, message: 'Please input rule name', trigger: 'blur' }],
    metric_type: [{ required: true, message: 'Please select a metric', trigger: 'change' }],
    comparison: [{ required: true, message: 'Please select a comparison', trigger: 'change' }],
    threshold: [{ required: true, message: 'Please input a threshold', trigger: 'change' }],
    severity: [{ required: true, message: 'Please select a severity', trigger: 'change' }]
  };
  
  // Computed properties
  const isAdmin = computed(() => authService.isAdmin());
  
  const uniqueHosts = computed(() => {
    const hosts = new Set();
    alerts.value.forEach(alert => hosts.add(alert.host));
    return Array.from(hosts);
  });
  
  // Table columns
  const columns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      sorter: (a, b) => {
        const order = { 'critical': 0, 'warning': 1, 'info': 2 };
        return order[a.severity] - order[b.severity];
      }
    },
    {
      title: 'Host',
      dataIndex: 'host',
      key: 'host',
      width: 150
    },
    {
      title: 'Alert',
      dataIndex: 'rule_name',
      key: 'rule_name'
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120
    },
    {
      title: 'Time',
      key: 'time',
      width: 150
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150
    }
  ];
  
  // Navigation function to rules page
  const navigateToRules = () => {
    router.push('/alerts/rules');
  };
  
  // Functions
  const fetchAlerts = async () => {
    loading.value = true;
    
    try {
      // Prepare query parameters
      const params = {};
      if (statusFilter.value !== 'all') {
        params.status = statusFilter.value;
      }
      if (hostFilter.value) {
        params.host = hostFilter.value;
      }
      
      // Fetch alerts
      const response = await api.getAlerts(params);
      alerts.value = response.data;
    } catch (error) {
      console.error('Error fetching alerts:', error);
      message.error('Failed to load alerts');
    } finally {
      loading.value = false;
    }
  };
  
  const acknowledgeAlert = async (alertId) => {
    try {
      await api.acknowledgeAlert(alertId);
      message.success('Alert acknowledged');
      
      // Refresh the alerts list
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      message.error('Failed to acknowledge alert');
    }
  };
  
  const showAddRuleModal = () => {
    // Reset form to default values
    ruleForm.value = {
      name: '',
      description: '',
      metric_type: 'cpu.percent',
      comparison: 'above',
      threshold: 80,
      duration_minutes: 5,
      severity: 'warning',
      notifications: {
        email_enabled: false,
        email_recipients: ''
      }
    };
    
    addRuleModalVisible.value = true;
  };
  
  const handleAddRule = async () => {
    try {
      // Validate form
      await ruleFormRef.value.validate();
      
      addingRule.value = true;
      
      // Create new rule
      await api.createAlertRule({
        name: ruleForm.value.name,
        description: ruleForm.value.description,
        metric_type: ruleForm.value.metric_type,
        comparison: ruleForm.value.comparison,
        threshold: ruleForm.value.threshold,
        duration_minutes: ruleForm.value.duration_minutes,
        severity: ruleForm.value.severity,
        targets: [{ type: 'all', id: '*' }],
        notifications: ruleForm.value.notifications
      });
      
      message.success('Alert rule created successfully');
      addRuleModalVisible.value = false;
      
      // Refresh alerts
      fetchAlerts();
    } catch (error) {
      console.error('Error creating alert rule:', error);
      message.error(error.response?.data?.error || 'Failed to create alert rule');
    } finally {
      addingRule.value = false;
    }
  };
  
  // Helper functions
  const getSeverityColor = (severity) => {
    const colors = {
      'info': 'blue',
      'warning': 'orange',
      'critical': 'red'
    };
    return colors[severity] || 'default';
  };
  
  const getStatusColor = (status) => {
    const colors = {
      'triggered': 'red',
      'acknowledged': 'orange',
      'resolved': 'green'
    };
    return colors[status] || 'default';
  };
  
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Lifecycle hooks
  onMounted(() => {
    fetchAlerts();
  });
  </script>
  
  <style scoped>
  .alerts-container {
    padding: 20px;
  }
  
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }
  
  .page-title {
    margin: 0;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
  }
  
  .filters {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
  }
  </style>