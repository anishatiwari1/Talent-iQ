import api from './api';

export const notificationService = {
  listNotifications: async (unreadOnly = false) => {
    const { data } = await api.get('/notifications', { params: { unread_only: unreadOnly } });
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count');
    return data.unread_count;
  },

  markRead: async (notificationId) => {
    const { data } = await api.post(`/notifications/${notificationId}/read`);
    return data;
  },

  markAllRead: async () => {
    await api.post('/notifications/read-all');
  },

  deleteNotification: async (notificationId) => {
    await api.delete(`/notifications/${notificationId}`);
  },

  clearRead: async () => {
    const { data } = await api.delete('/notifications/read');
    return data.deleted;
  },
};
