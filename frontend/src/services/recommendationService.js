import api, { assetUrl } from './api';

function adaptRecommendation(r) {
  return {
    employeeId: r.employee_id,
    name: r.employee_name,
    department: r.department,
    role: r.job_title,
    matchScore: r.score,
    rank: r.rank,
    matchedSkills: r.matched_skills,
    missingSkills: r.missing_skills,
    experienceYears: r.experience_years,
    semanticSimilarity: r.semantic_similarity,
    currentWorkload: r.current_utilization_percentage,
    availability: r.available_capacity_percentage,
    reason: r.reason,
    contributingFactors: r.contributing_factors,
    recommendationId: r.recommendation_id,
    avatarUrl: assetUrl(r.avatar_url),
    staffedOnProject: r.staffed_on_project,
    onPendingTeam: r.on_pending_team,
  };
}

export const recommendationService = {
  // Runs the scoring engine fresh and persists a new ranked batch.
  generateRecommendations: async (projectId, topN = 10) => {
    const { data } = await api.post(
      `/recommendations/projects/${projectId}/generate`,
      null,
      { params: { top_n: topN } }
    );
    return data.map(adaptRecommendation).sort((a, b) => b.matchScore - a.matchScore);
  },

  // Reads back the most recently generated batch without recomputing.
  getRecommendations: async (projectId) => {
    const { data } = await api.get(`/recommendations/projects/${projectId}`);
    return data.map(adaptRecommendation).sort((a, b) => b.matchScore - a.matchScore);
  },
};
