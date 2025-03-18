<template>
  <a-layout style="min-height: 100vh">
    <!-- Using the HiHello component for header and sidebar -->
    <HiHello>
      <!-- Hosts container -->
      <HostsList />
    </HiHello>
  </a-layout>
</template>

<script setup>
import HiHello from '@/components/HiHello.vue'
import HostsList from '@/components/HostsList.vue'
</script>

<style scoped>
/* Add any view-specific styles here */
</style>
