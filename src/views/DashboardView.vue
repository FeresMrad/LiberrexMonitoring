<template>
  <a-layout style="min-height: 100vh">
    <HiHello>
      <div class="not-found-container">
        <a-result 
          status="404" 
          title="Dashboard placeholder" 
        >
          <template #extra>
            <a-button type="primary" @click="goHome">Back Home</a-button>
          </template>
        </a-result>
      </div>
    </HiHello>
  </a-layout>
</template>

<script setup>
import { useRouter } from 'vue-router';
import HiHello from "@/components/HiHello.vue";

const router = useRouter();

const goHome = () => {
  router.push('/dashboard');
};
</script>

<style scoped>
.not-found-container {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}
</style>