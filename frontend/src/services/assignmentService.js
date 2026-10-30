import api from './api';

export const assignmentService = {
  // The Phase 12 approval gate for a single recommendation. This is
  // the only thing that turns a recommendation into a real staffing
  // change -- nothing auto-assigns.
  approveRecommendation: async (recommendationId, { allocationPercentage = 100, roleOnProject } = {}) => {
    const { data } = await api.post(`/assignments/recommendations/${recommendationId}/approve`, {
      allocation_percentage: allocationPercentage,
      role_on_project: roleOnProject,
    });
    return data;
  },

  rejectRecommendation: async (recommendationId) => {
    const { data } = await api.post(`/assignments/recommendations/${recommendationId}/reject`);
    return data;
  },
};
