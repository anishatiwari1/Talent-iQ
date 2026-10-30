import api from './api';

function titleCase(s) {
  if (!s) return s;
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function adaptProject(p) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    department: p.department,
    status: titleCase(p.status),
    stage: p.stage || 'REQUIREMENTS',
    stageHistory: (p.stage_history || []).map((event) => ({
      stage: event.stage,
      enteredAt: event.entered_at,
      changedBy: event.changed_by,
    })),
    priority: titleCase(p.priority),
    startDate: p.start_date,
    endDate: p.end_date,
    teamSize: p.required_team_size ?? 0,
    requiredSkills: (p.required_skills || []).map((rs) => ({
      skillId: rs.skill_id,
      name: rs.skill_name,
      requiredProficiency: rs.required_proficiency,
      importance: rs.importance,
    })),
    // Kept as an array (rather than just staffed_count) so components
    // that do `project.assignedTeam.length` keep working -- populated
    // lazily via getProjectStaffing() where actually needed, empty
    // here to avoid an extra request per project in a list view.
    assignedTeam: new Array(p.staffed_count || 0).fill(null),
  };
}

export const projectService = {
  getProjects: async (filters = {}) => {
    const params = {};
    if (filters.status && filters.status !== 'All') params.status_filter = filters.status;
    if (filters.department && filters.department !== 'All') params.department = filters.department;
    if (filters.priority && filters.priority !== 'All') params.priority = filters.priority;
    if (filters.search) params.search = filters.search;

    const { data } = await api.get('/projects', { params });
    return data.map(adaptProject);
  },

  getProjectById: async (id) => {
    const { data } = await api.get(`/projects/${id}`);
    return adaptProject(data);
  },

  createProject: async (projectData) => {
    const payload = {
      name: projectData.name,
      description: projectData.description,
      department: projectData.department,
      priority: (projectData.priority || 'MEDIUM').toUpperCase(),
      status: (projectData.status || 'PLANNING').toUpperCase(),
      start_date: projectData.startDate,
      end_date: projectData.endDate,
      required_team_size: projectData.teamSize,
      required_skills: (projectData.requiredSkills || []).map((rs) => ({
        skill_id: rs.skillId,
        required_proficiency: rs.requiredProficiency || 1,
        importance: rs.importance || 'IMPORTANT',
      })),
    };
    const { data } = await api.post('/projects', payload);
    return adaptProject(data);
  },

  updateProject: async (id, updates) => {
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.department !== undefined) payload.department = updates.department;
    if (updates.priority !== undefined) payload.priority = updates.priority.toUpperCase();
    if (updates.status !== undefined) payload.status = updates.status.toUpperCase();
    if (updates.startDate !== undefined) payload.start_date = updates.startDate;
    if (updates.endDate !== undefined) payload.end_date = updates.endDate;
    if (updates.teamSize !== undefined) payload.required_team_size = updates.teamSize;
    if (updates.requiredSkills !== undefined) {
      payload.required_skills = updates.requiredSkills.map((rs) => ({
        skill_id: rs.skillId,
        required_proficiency: rs.requiredProficiency,
        importance: rs.importance,
      }));
    }
    const { data } = await api.patch(`/projects/${id}`, payload);
    return adaptProject(data);
  },

  updateStage: async (id, stage) => {
    const { data } = await api.patch(`/projects/${id}/stage`, { stage });
    return adaptProject(data);
  },

  archiveProject: async (id) => {
    const { data } = await api.post(`/projects/${id}/archive`);
    return adaptProject(data);
  },

  getProjectStaffing: async (id) => {
    const { data } = await api.get(`/projects/${id}/staffing`);
    return data.map((s) => ({
      employeeId: s.employee_id,
      name: s.employee_name,
      role: s.role_on_project,
      status: s.status,
      allocation: s.allocation_percentage,
    }));
  },
};
