<template>
    <div class="metrics-table">
      <table>
        <thead>
          <tr>
            <th>Current Memory (GB)</th>
            <th>Max Memory (GB)</th>
            <th>Current Disk (GB)</th>
            <th>Max Disk (GB)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ currentMemory }} GB</td>
            <td>{{ maxMemory }} GB</td>
            <td>{{ currentDisk }} GB</td>
            <td>{{ maxDisk }} GB</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue';
  defineProps({
    currentMemory: {
      type: Number,
      required: true
    },
    maxMemory: {
      type: Number,
      required: true
    },
    currentDisk: {
      type: Number,
      required: true
    },
    maxDisk: {
      type: Number,
      required: true
    }
  })
  </script>
  
  <style scoped>
  .metrics-table table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  
  .metrics-table th,
  .metrics-table td {
    padding: 10px;
    text-align: center;
    border: 1px solid #ccc;
  }
  
  .metrics-table th {
    background-color: #f0f0f0;
    font-weight: bold;
  }
  
  .metrics-table td {
    font-size: 16px;
  }
  </style>
  