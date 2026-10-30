import api from './api';

export const skillService = {
  listSkills: async (category) => {
    const params = category && category !== 'All' ? { category } : {};
    const { data } = await api.get('/skills', { params });
    return data;
  },

  createSkill: async ({ name, category, description }) => {
    const { data } = await api.post('/skills', { name, category, description });
    return data;
  },
};
