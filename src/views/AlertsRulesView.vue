<!-- src/views/AlertsRulesView.vue -->
<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="rules-container">
        <div class="header-row">
          <h2>Alert Rules</h2>
          <a-button type="primary" @click="handleAddRule">
            <template #icon><PlusOutlined /></template>
            Add Rule
          </a-button>
        </div>

        <!-- Rules Table Component -->
        <RulesTable 
          ref="rulesTableRef" 
          @edit="handleEditRule"
          @refresh="handleRefresh"
        />

        <!-- Add/Edit Rule Form Component -->
        <AddRuleForm 
          ref="ruleFormRef"
          :rule="selectedRule"
          @saved="handleRuleSaved"
          @cancel="handleRuleCancel"
        />
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { PlusOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import HiHello from "@/components/HiHello.vue";
import RulesTable from "@/components/RulesTable.vue";
import AddRuleForm from "@/components/AddRuleForm.vue";
import authService from '@/services/auth';

// References to child components
const rulesTableRef = ref(null);
const ruleFormRef = ref(null);

// State for editing
const selectedRule = ref(null);

// Handle adding a new rule
const handleAddRule = () => {
  selectedRule.value = null; // Clear any selected rule
  ruleFormRef.value.showModal();
};

// Handle editing a rule
const handleEditRule = (rule) => {
  selectedRule.value = rule;
  ruleFormRef.value.showModalForEdit(rule);
};

// Handle rule saved event
const handleRuleSaved = () => {
  // Refresh the table to show updated data
  rulesTableRef.value.fetchRules();
  // Clear selected rule
  selectedRule.value = null;
};

// Handle rule cancel event
const handleRuleCancel = () => {
  // Clear selected rule
  selectedRule.value = null;
};

// Handle refresh event
const handleRefresh = () => {
  // Additional refresh logic can be added here if needed
  console.log('Rules data refreshed');
};

// Lifecycle hooks
onMounted(() => {
  // Check if user is admin
  if (!authService.isAdmin()) {
    message.error('You do not have permission to access this page');
    return;
  }
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