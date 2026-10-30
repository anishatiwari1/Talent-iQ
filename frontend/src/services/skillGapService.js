import api from './api';

// An actual shortfall in available qualified people outranks having few
// holders of a skill; concentration alone is a Medium warning.
export const skillGapUrgency = (g) => {
  if (g.shortage_risk === 'SHORTAGE') return 'High';
  if (g.insufficient_coverage || g.concentration_risk) return 'Medium';
  return 'Low';
};

export const skillGapService = {
  getProjectGaps: async (projectId) => {
    const { data } = await api.get(`/skill-gaps/projects/${projectId}`);
    return data;
  },

  getTeamGaps: async (teamId) => {
    const { data } = await api.get(`/skill-gaps/teams/${teamId}`);
    return data;
  },

  getProjectAnalysis: async (projectId) => {
    const { data } = await api.get(`/skill-gaps/projects/${projectId}/analysis`);
    return data;
  },

  getRelatedSkillSuggestions: async (projectId) => {
    const { data } = await api.get(`/skill-gaps/projects/${projectId}/related-skill-suggestions`);
    return data;
  },

  // Knowledge-graph dashboard (read only from Neo4j)
  getGraphOrganization: async () => {
    const { data } = await api.get('/skill-gaps/graph/organization');
    return data;
  },

  getGraphProjects: async () => {
    const { data } = await api.get('/skill-gaps/graph/projects');
    return data;
  },

  getGraphProject: async (projectId) => {
    const { data } = await api.get(`/skill-gaps/graph/projects/${projectId}`);
    return data;
  },

  getOrganizationGaps: async () => {
    const { data } = await api.get('/skill-gaps/organization');
    return data.map((g) => ({
      skill: g.skill_name,
      skillId: g.skill_id,
      urgency: skillGapUrgency(g),
      impactedProjects: g.projects_requiring,
      requirementsUncovered: g.requirements_uncovered,
      requirementsCovered: g.requirements_covered,
      employeesQualified: g.employees_qualified,
      employeesQualifiedAvailable: g.employees_qualified_available,
      employeesCapacityUnknown: g.employees_capacity_unknown,
      shortageRisk: g.shortage_risk,
      employeesWithSkillAnyLevel: g.employees_with_skill_any_level,
      maxRequiredLevel: g.max_required_level,
      coverageRatio: g.coverage_ratio,
      insufficientCoverage: g.insufficient_coverage,
      concentrationRisk: g.concentration_risk,
    }));
  },
};
