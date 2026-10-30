import api, { assetUrl } from './api';

function adaptTeam(t) {
  return {
    teamId: t.team_id,
    projectId: t.project_id,
    status: t.status,
    skillCoverage: t.skill_coverage_percentage,
    members: t.members.map((m) => ({
      employeeId: m.employee_id,
      name: m.employee_name,
      role: m.role_on_team,
      matchScore: m.match_score,
      matchedSkills: m.matched_skills,
      jobTitle: m.job_title,
      department: m.department,
      email: m.email,
      avatarUrl: assetUrl(m.avatar_url),
      experienceYears: m.experience_years,
      deliveredProjectsCount: m.delivered_projects_count ?? 0,
      allocation: m.allocation_percentage,
      utilization: m.utilization_percentage,
      availabilityStatus: m.availability_status,
      requiredSkills: (m.required_skills || []).map((skill) => ({
        name: skill.name,
        level: skill.level,
        requiredLevel: skill.required_level,
        meetsRequirement: skill.meets_requirement,
      })),
    })),
    remainingGaps: t.remaining_gaps,
    availabilityDataMissing: t.availability_data_missing || [],
  };
}

export const teamService = {
  // The staffed team and any newer unapproved proposal for a project.
  getCurrentTeams: async (projectId) => {
    const { data } = await api.get(`/team-matching/projects/${projectId}/teams/current`);
    return {
      approved: data.approved ? adaptTeam(data.approved) : null,
      pending: data.pending ? adaptTeam(data.pending) : null,
    };
  },

  // A team from the manager's own picks; approve=true staffs it at once.
  createTeam: async (projectId, employeeIds, approve = false) => {
    const { data } = await api.post(`/team-matching/projects/${projectId}/teams`, {
      employee_ids: employeeIds,
      approve,
    });
    return adaptTeam(data);
  },

  getApprovedTeam: async (projectId) => {
    const { data } = await api.get(`/team-matching/projects/${projectId}/approved-team`);
    return adaptTeam(data);
  },

  formTeam: async (projectId, teamSize) => {
    const { data } = await api.post(
      `/team-matching/projects/${projectId}/form-team`,
      null,
      { params: { team_size: teamSize } }
    );
    return adaptTeam(data);
  },

  regenerateTeam: async (teamId, teamSize) => {
    const { data } = await api.post(
      `/team-matching/teams/${teamId}/regenerate`,
      null,
      { params: { team_size: teamSize } }
    );
    return adaptTeam(data);
  },

  replaceMember: async (teamId, oldEmployeeId, newEmployeeId) => {
    const { data } = await api.post(
      `/team-matching/teams/${teamId}/members/${oldEmployeeId}/replace-with/${newEmployeeId}`
    );
    return adaptTeam(data);
  },

  // Ranked employees not on the team, each flagged eligible/ineligible
  // for this project's window so the UI only offers valid choices.
  getCandidates: async (teamId) => {
    const { data } = await api.get(`/team-matching/teams/${teamId}/candidates`);
    return data.map((c) => ({
      employeeId: c.employee_id,
      name: c.name,
      role: c.job_title,
      department: c.department,
      matchScore: c.match_score,
      availableCapacity: c.available_capacity_percentage,
      matchedSkills: c.matched_skills,
      eligible: c.eligible,
      ineligibleReason: c.ineligible_reason,
    }));
  },

  removeMember: async (teamId, employeeId) => {
    const { data } = await api.delete(`/team-matching/teams/${teamId}/members/${employeeId}`);
    return adaptTeam(data);
  },

  addMember: async (teamId, employeeId) => {
    const { data } = await api.post(`/team-matching/teams/${teamId}/members/${employeeId}`);
    return adaptTeam(data);
  },

  // The Phase 12 approval gate -- APPROVE turns this proposal into
  // real Assignment + EmployeeProject rows; REJECT just closes it out.
  decideTeam: async (teamId, action, employeeIds = null) => {
    const { data } = await api.post(`/team-matching/teams/${teamId}/decision`, {
      action,
      employee_ids: employeeIds,
    });
    return adaptTeam(data);
  },
};
