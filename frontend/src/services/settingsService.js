import api from './api';

export const settingsService = {
  getPreferences: async () => {
    const { data } = await api.get('/auth/me/preferences');
    return data;
  },

  updatePreferences: async (updates) => {
    const { data } = await api.patch('/auth/me/preferences', updates);
    return data;
  },

  updateAccount: async ({ fullName }) => {
    const { data } = await api.patch('/auth/me', { full_name: fullName });
    return data;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    await api.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
