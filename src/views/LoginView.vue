<template>
    <div class="login-container">
      <div class="login-form">
        <div class="logo-container">
          <img src="../assets/logoliberrex.png" alt="Logo" class="logo" />
        </div>
        
        <!--h2>Login to Monitoring System</h2>-->
        
        <div v-if="authError" class="error-message">
          {{ authError }}
        </div>
        
        <a-form
          :model="formState"
          name="login"
          @finish="onFinish"
          autocomplete="off"
          layout="vertical"
        >
          <a-form-item
            label="Email"
            name="email"
            :rules="[{ required: true, message: 'Please input your email!' }]"
          >
            <a-input v-model:value="formState.email">
              <template #prefix>
                <UserOutlined />
              </template>
            </a-input>
          </a-form-item>
  
          <a-form-item
            label="Password"
            name="password"
            :rules="[{ required: true, message: 'Please input your password!' }]"
          >
            <a-input-password v-model:value="formState.password">
              <template #prefix>
                <LockOutlined />
              </template>
            </a-input-password>
          </a-form-item>
  
          <a-form-item>
            <a-button
              type="primary"
              html-type="submit"
              :loading="isLoading"
              block
            >
              Log in
            </a-button>
          </a-form-item>
          
          admin@example.com / adminpass
        </a-form>
      </div>
    </div>
  </template>
  
  <script setup>
  import { reactive, computed, onMounted } from 'vue';
  import { UserOutlined, LockOutlined } from '@ant-design/icons-vue';
  import { useRouter } from 'vue-router';
  import authService from '@/services/auth';
  
  const router = useRouter();
  
  // Form state
  const formState = reactive({
    email: '',
    password: '',
  });
  
  // Computed properties from auth service
  const isLoading = computed(() => authService.isLoading.value);
  const authError = computed(() => authService.authError.value);
  
  // Handle form submission
  const onFinish = async () => {
    const success = await authService.login(formState.email, formState.password);
    
    if (success) {
      // Redirect to dashboard after successful login
      router.push('/dashboard');
    }
  };
  
  // Redirect if already logged in
  onMounted(() => {
    if (authService.isAuthenticated.value) {
      router.push('/dashboard');
    }
  });
  </script>
  
  <style scoped>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-color: #f0f2f5;
  }
  
  .login-form {
    width: 100%;
    max-width: 400px;
    padding: 30px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
  }
  
  .logo {
    height: 50px;
  }
  
  h2 {
    text-align: center;
    margin-bottom: 24px;
    color: #008fca;
  }
  
  .error-message {
    background-color: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 4px;
    padding: 8px 12px;
    margin-bottom: 16px;
    color: #ff4d4f;
  }
  
  .test-credentials {
    margin-top: 20px;
    padding: 15px;
    background-color: #e6f7ff;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .test-credentials p {
    margin-bottom: 8px;
    font-weight: bold;
  }
  
  .test-credentials ul {
    margin: 0;
    padding-left: 20px;
  }
  </style>