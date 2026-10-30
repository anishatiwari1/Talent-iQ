import api, { assetUrl } from './api';

// Maps a backend proficiency_level (1-5) to a display percentage/level
// label. Kept in one place so every screen that shows a skill bar
// agrees on what "4/5" means.
function proficiencyToDisplay(level) {
  const score = Math.round((level / 5) * 100);
  const label =
    level >= 5 ? 'expert' : level >= 4 ? 'advanced' : level >= 3 ? 'intermediate' : 'beginner';
  return { score, label };
}

function adaptEmployeeSkill(es) {
  return {
    skillId: es.skill.id,
    name: es.skill.name,
    category: es.skill.category,
    level: proficiencyToDisplay(es.proficiency_level).label,
    score: proficiencyToDisplay(es.proficiency_level).score,
    proficiencyLevel: es.proficiency_level,
    yearsOfExperience: es.years_of_experience,
    source: es.source,
  };
}

function adaptCertification(c) {
  return {
    id: c.id,
    name: c.name,
    issuer: c.issuer,
    credentialId: c.credential_id,
    credentialUrl: c.credential_url,
    issueDate: c.issue_date,
    expiryDate: c.expiry_date,
    documentId: c.document_id,
    documentFileName: c.document_file_name,
  };
}

function adaptDeliveredProject(p) {
  return {
    projectId: p.project_id,
    name: p.project_name,
    description: p.description,
    department: p.department,
    role: p.role_on_project,
    allocation: p.allocation_percentage,
    startDate: p.start_date,
    endDate: p.end_date,
    technologies: p.technologies || [],
  };
}

// Adapts the backend's EmployeeProfileOut shape into the flatter shape
// the existing dashboard components expect (profile.name, .role,
// .workload, .skills[].score, etc.) so those components don't need to
// be rewritten just because the data source changed.
function adaptProfile(backendProfile) {
  const availability = backendProfile.availability;
  const utilization = availability?.utilization_percentage ?? (
    availability && availability.weekly_capacity_hours
      ? Math.round((availability.allocated_hours / availability.weekly_capacity_hours) * 100)
      : 0
  );

  return {
    id: backendProfile.employee_code,
    employeeDbId: backendProfile.id,
    name: backendProfile.full_name,
    email: backendProfile.email,
    role: backendProfile.job_title,
    department: backendProfile.department,
    experience: backendProfile.experience_years,
    bio: backendProfile.bio,
    linkedinUrl: backendProfile.linkedin_url,
    githubUrl: backendProfile.github_url,
    portfolioUrl: backendProfile.portfolio_url,
    location: backendProfile.location,
    avatarUrl: assetUrl(backendProfile.avatar_url),
    deliveredProjectsCount: backendProfile.delivered_projects_count ?? 0,
    deliveredProjects: (backendProfile.delivered_projects || []).map(adaptDeliveredProject),
    activeProjectsCount: backendProfile.active_projects_count ?? 0,
    memberSince: backendProfile.member_since,
    status: backendProfile.is_active ? 'Active' : 'Inactive',
    workload: Math.round(utilization),
    availability: Math.max(100 - Math.round(utilization), 0),
    availabilityStatus: backendProfile.availability_status,
    availabilityDetails: availability,
    skills: (backendProfile.skills || []).map(adaptEmployeeSkill),
    certifications: (backendProfile.certifications || []).map(adaptCertification),
    expertiseAreas: (backendProfile.expertise_areas || []).map((item) => item.name),
    resumeProjects: (backendProfile.resume_projects || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      technologies: item.technologies || [],
    })),
  };
}

export const employeeService = {
  // ---- Employee self-service ----

  getMyProfile: async () => {
    const { data } = await api.get('/employees/me');
    return adaptProfile(data);
  },

  updateMyProfile: async (updates) => {
    const payload = {};
    if (updates.department !== undefined) payload.department = updates.department;
    if (updates.role !== undefined) payload.job_title = updates.role;
    if (updates.experience !== undefined) payload.experience_years = updates.experience;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.linkedinUrl !== undefined) payload.linkedin_url = updates.linkedinUrl;
    if (updates.githubUrl !== undefined) payload.github_url = updates.githubUrl;
    if (updates.portfolioUrl !== undefined) payload.portfolio_url = updates.portfolioUrl;
    if (updates.location !== undefined) payload.location = updates.location;
    const { data } = await api.patch('/employees/me', payload);
    return adaptProfile(data);
  },

  uploadMyAvatar: async (file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/employees/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return adaptProfile(data);
  },

  addMySkill: async ({ skillId, proficiencyLevel = 3, yearsOfExperience = 0 }) => {
    const { data } = await api.post('/employees/me/skills', {
      skill_id: skillId,
      proficiency_level: proficiencyLevel,
      years_of_experience: yearsOfExperience,
    });
    return adaptEmployeeSkill(data);
  },

  removeMySkill: async (skillId) => {
    await api.delete(`/employees/me/skills/${skillId}`);
  },

  addMyCertification: async ({ name, issuer, credentialId, credentialUrl, issueDate, expiryDate, documentId }) => {
    const { data } = await api.post('/employees/me/certifications', {
      name,
      issuer,
      credential_id: credentialId || null,
      credential_url: credentialUrl || null,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      document_id: documentId ? Number(documentId) : null,
    });
    return adaptCertification(data);
  },

  linkCertificationDocument: async (certificationId, documentId) => {
    const { data } = await api.patch(`/employees/me/certifications/${certificationId}/document`, {
      document_id: documentId ? Number(documentId) : null,
    });
    return adaptCertification(data);
  },

  removeMyCertification: async (certificationId) => {
    await api.delete(`/employees/me/certifications/${certificationId}`);
  },

  getMyAvailability: async () => {
    const { data } = await api.get('/employees/me/availability');
    return data;
  },

  updateMyAvailability: async (updates) => {
    const { data } = await api.patch('/employees/me/availability', updates);
    return data;
  },

  requestCapacityChange: async (requestedCapacityHours, reason) => {
    const { data } = await api.post('/employees/me/availability/capacity-request', {
      requested_capacity_hours: requestedCapacityHours,
      reason,
    });
    return data;
  },

  withdrawCapacityRequest: async () => {
    const { data } = await api.delete('/employees/me/availability/capacity-request');
    return data;
  },

  // Manager: approve or decline an employee's pending capacity request.
  decideCapacityRequest: async (employeeDbId, action, note) => {
    const { data } = await api.post(`/employees/${employeeDbId}/capacity-request/decision`, { action, note });
    return data;
  },

  getMyWorkload: async (weeks = 12) => {
    const { data } = await api.get('/employees/me/workload', { params: { weeks } });
    return data;
  },

  getMyDevelopmentRoadmap: async () => {
    const { data } = await api.get('/employees/me/development');
    return data;
  },

  getMyDeliveredProjects: async () => {
    const { data } = await api.get('/employees/me/delivered-projects');
    return data.map(adaptDeliveredProject);
  },

  getMyProjectHistory: async () => {
    const { data } = await api.get('/employees/me/projects');
    return data.map((h) => ({
      id: h.project_id,
      name: h.project_name,
      role: h.role_on_project,
      status: h.status,
      allocation: h.allocation_percentage,
      startDate: h.start_date,
      endDate: h.end_date,
    }));
  },

  // ---- Manager-facing directory ----

  getEmployees: async (filters = {}, { signal } = {}) => {
    const params = {};
    if (filters.department && filters.department !== 'All') params.department = filters.department;
    if (filters.skillId) params.skill_id = filters.skillId;
    if (filters.minProficiency) params.min_proficiency = filters.minProficiency;
    if (filters.maxUtilization !== undefined && filters.maxUtilization !== null && filters.maxUtilization !== '') {
      params.max_utilization = filters.maxUtilization;
    }
    if (filters.availabilityStatus && filters.availabilityStatus !== 'All') {
      params.availability_status = filters.availabilityStatus;
    }
    if (filters.search) params.search = filters.search;
    if (filters.sort) params.sort = filters.sort;

    const { data } = await api.get('/employees', { params, signal });
    return data.map((e) => ({
      id: e.employee_code,
      employeeDbId: e.id,
      name: e.full_name,
      department: e.department,
      role: e.job_title,
      experience: e.experience_years,
      availabilityStatus: e.availability_status,
      workload: Math.round(e.utilization_percentage),
      skills: e.skill_names,
      avatarUrl: assetUrl(e.avatar_url),
      deliveredProjectsCount: e.delivered_projects_count ?? 0,
      availabilityNote: e.availability_note,
      availableFrom: e.available_from,
    }));
  },

  getDepartments: async () => {
    const { data } = await api.get('/employees/departments');
    return data;
  },

  getEmployeeById: async (employeeDbId) => {
    const { data } = await api.get(`/employees/${employeeDbId}`);
    return adaptProfile(data);
  },

  getEmployeeProjectHistory: async (employeeDbId) => {
    const { data } = await api.get(`/employees/${employeeDbId}/projects`);
    return data;
  },
};
