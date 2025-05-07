<template>
    <div class="notifications-dropdown">
      <!-- Bell icon with notification count badge -->
      <a-dropdown 
        v-model:open="dropdownVisible" 
        trigger="click"
        placement="bottomRight"
        :getPopupContainer="(trigger) => trigger.parentNode"
        @openChange="handleVisibilityChange"
      >
        <div class="notification-icon">
          <bell-outlined />
          <a-badge :count="unreadCount" :offset="[0, 8]" v-if="unreadCount > 0" />
        </div>
        
        <template #overlay>
          <a-menu style="width: 350px; max-height: 500px;">
            <div class="dropdown-header">
              <span class="title">Notifications</span>
              <a-button 
                type="link" 
                size="small" 
                @click="markAllAsRead"
                :disabled="notifications.length === 0 || markingAllRead"
              >
                Mark all as read
              </a-button>
            </div>
    
            <div class="dropdown-content">
              <a-spin :spinning="loading" tip="Loading notifications...">
                <div v-if="notifications.length === 0" class="empty-state">
                  <inbox-outlined />
                  <span>No notifications</span>
                </div>
                
                <a-list v-else class="notification-list">
                  <a-list-item 
                    v-for="notification in notifications" 
                    :key="notification.id"
                    :class="{ 'notification-read': notification.read, 'notification-unread': !notification.read }"
                    @click="viewNotification(notification)"
                  >
                    <div class="notification-item">
                      <div class="notification-severity" :class="notification.severity">
                        <!-- Show different icons based on severity -->
                        <warning-outlined v-if="notification.severity === 'critical'" />
                        <exclamation-outlined v-else-if="notification.severity === 'warning'" />
                        <info-circle-outlined v-else />
                      </div>
                      <div class="notification-content">
                        <div class="notification-title">
                          {{ notification.title }}
                          <span class="notification-host">{{ notification.host }}</span>
                        </div>
                        <div class="notification-message" v-html="generateNotificationMessage(notification)"></div>
                        <div class="notification-time">{{ formatTime(notification.time) }}</div>
                      </div>
                      <div class="notification-actions">
                        <check-outlined 
                          v-if="!notification.read" 
                          @click.stop="markAsRead(notification.id)" 
                          title="Mark as read"
                        />
                      </div>
                    </div>
                  </a-list-item>
                </a-list>
              </a-spin>
            </div>
    
            <div class="dropdown-footer">
              <router-link to="/alerts" @click="hideDropdown">View all alerts</router-link>
            </div>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { 
    BellOutlined, 
    InboxOutlined, 
    WarningOutlined,
    ExclamationOutlined,
    InfoCircleOutlined,
    CheckOutlined
  } from '@ant-design/icons-vue';
  import websocket from '@/services/websocket';
  import authService from '@/services/auth';
  import api from '@/services/api';
  
  const router = useRouter();
  const dropdownVisible = ref(false);
  const notifications = ref([]);
  const loading = ref(false);
  const markingAllRead = ref(false);
  
  // Calculate unread count
  const unreadCount = computed(() => {
    return notifications.value.filter(notification => !notification.read).length;
  });
  
  // Handle dropdown visibility change
  const handleVisibilityChange = (visible) => {
    dropdownVisible.value = visible;
    
    // If opening the dropdown, fetch latest notifications
    if (visible) {
      fetchNotifications();
    }
  };
  
  // Hide dropdown
  const hideDropdown = () => {
    dropdownVisible.value = false;
  };
  
  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hr ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!authService.isAuthenticated.value) return;
    
    loading.value = true;
    
    try {
      const response = await api.getNotifications();
      notifications.value = response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      loading.value = false;
    }
  };
  
  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.markNotificationAsRead(notificationId);
      
      // Update local state
      const index = notifications.value.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        notifications.value[index].read = true;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    markingAllRead.value = true;
    
    try {
      await api.markAllNotificationsAsRead();
      
      // Update local state
      notifications.value.forEach(notification => {
        notification.read = true;
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    } finally {
      markingAllRead.value = false;
    }
  };
  
  // View notification - navigate to alert details and mark as read
  const viewNotification = (notification) => {
    // Mark as read if not already
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate to alert page 
    router.push('/alerts');
    
    // Hide dropdown
    hideDropdown();
  };

  // Generate notification message based on available data
const generateNotificationMessage = (notification) => {
  // If we have all the necessary fields, generate the message
  if (notification.metric_type && notification.host && notification.value !== undefined && 
      notification.threshold !== undefined && notification.comparison) {
    
    // Format the metric name (replace dots with spaces, ALL CAPS)
    const metricName = notification.metric_type
      .replace('.', ' ')
      .toUpperCase();
    
    // Get comparison symbol
    const comparisonSymbol = {
      'above': '>',
      'below': '<',
      'equal': '='
    }[notification.comparison] || '≠';
    
    // Format the value with appropriate units
    const value = notification.metric_type.includes('percent') ? 
      `${notification.value}%` : notification.value.toString();
    
    // Format the threshold with the same units
    const threshold = notification.metric_type.includes('percent') ? 
      `${notification.threshold}%` : notification.threshold.toString();
    
    // Format the message with a cleaner approach
    return `${metricName}: <strong>${value}</strong> ${comparisonSymbol} ${threshold}`;
  }
  
  // Fallback: If we don't have all the fields, use the original message
  return notification.message;
};
  
  // Handle WebSocket alert notification
  const handleAlertNotification = (data) => {
  notifications.value.unshift({
    id: data.id,
    title: data.rule_name,
    message: data.message, // Keep for fallback
    severity: data.severity || 'info',
    host: data.host,
    time: data.triggered_at,
    read: false,
    metric_type: data.metric_type,
    comparison: data.comparison,
    threshold: data.threshold,
    value: data.value
  });
};
  
  onMounted(() => {
    // Initial fetch if authenticated
    if (authService.isAuthenticated.value) {
      fetchNotifications();
    }
    
    // Listen for alert notifications via WebSocket
    websocket.addEventListener('alert_notification', handleAlertNotification);
  });
  
  onUnmounted(() => {
    // Clean up event listener
    websocket.removeEventListener('alert_notification', handleAlertNotification);
  });
  </script>
  
  <style scoped>
  .notifications-dropdown {
    position: relative;
    display: inline-block;
  }
  
  .notification-icon {
    cursor: pointer;
    font-size: 20px;
    position: relative;
  }
  
  /* Style the dropdown menu content */
  .dropdown-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .dropdown-header .title {
    font-weight: bold;
    font-size: 16px;
  }
  
  .dropdown-content {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #999;
  }
  
  .empty-state .anticon {
    font-size: 24px;
    margin-bottom: 8px;
  }
  
  .notification-list {
    width: 100%;
  }
  
  .notification-item {
    display: flex;
    padding: 8px 16px;
    border-bottom: 1px solid #f0f0f0;
    width: 100%;
  }
  
  .notification-severity {
    margin-right: 12px;
    font-size: 20px;
    padding-top: 2px;
  }
  
  .notification-severity.info {
    color: #1890ff;
  }
  
  .notification-severity.warning {
    color: #faad14;
  }
  
  .notification-severity.critical {
    color: #f5222d;
  }
  
  .notification-content {
    flex: 1;
  }
  
  .notification-title {
    font-weight: bold;
    margin-bottom: 4px;
  }
  
  .notification-host {
    font-weight: normal;
    color: #666;
    font-size: 12px;
    margin-left: 8px;
  }
  
  .notification-message {
    font-size: 14px;
    margin-bottom: 4px;
  }
  
  .notification-time {
    font-size: 12px;
    color: #999;
  }
  
  .notification-actions {
    display: flex;
    align-items: center;
    color: #1890ff;
  }
  
  .notification-unread {
    background-color: #e6f7ff;
    border-left: 3px solid #1890ff;
  }
  
  .notification-read {
    background-color: white;
  }
  
  .dropdown-footer {
    padding: 8px 16px;
    text-align: center;
    border-top: 1px solid #f0f0f0;
  }
  
  .dropdown-footer a {
    color: #1890ff;
    text-decoration: none;
  }
  </style>