import api from './api';
import { skillGapUrgency } from './skillGapService';

// Real Workforce Intelligence data (Phase 11), shaped for the existing
// AdminDashboard component. Every number here comes from an actual
// Postgres aggregation in workforce_service.py -- nothing is
// hardcoded. One deliberate change from the original mock shape:
// there is no `workforceUtilizationTrend` (a 6-month history) because
// the backend does not persist a time series yet, and fabricating one
// would violate the project's "never hardcode dashboard stats" rule.
// `departmentUtilization` (real, current) is provided instead --
// AdminDashboard.jsx has been updated to chart that.
export const analyticsService = {
  getWorkforceAnalytics: async (department) => {
    const params = department && department !== 'All' ? { department } : {};
    const [overviewRes, gapsRes] = await Promise.all([
      api.get('/workforce/overview', { params }),
      api.get('/skill-gaps/organization'),
    ]);
    const overview = overviewRes.data;
    const gaps = gapsRes.data;

    return {
      kpis: {
        totalEmployees: overview.total_employees,
        availableEmployees: overview.available_employees,
        averageWorkforceUtilization: overview.average_utilization_percentage,
        activeProjects: overview.active_projects_count,
        assignedEmployees: overview.assigned_employees,
        underutilizedEmployees: overview.underutilized_employees.length,
        skillGapsIdentified: gaps.filter((g) => g.insufficient_coverage).length,
        pendingRecommendations: overview.pending_recommendations_count,
      },
      departmentUtilization: overview.department_utilization,
      workloadDistribution: overview.workload_distribution,
      departmentBreakdown: overview.department_breakdown,
      skillDistribution: overview.skill_distribution,
      overloadedEmployees: overview.overloaded_employees,
      underutilizedEmployeesList: overview.underutilized_employees,
      organizationSkillGaps: gaps.map((g) => ({
        skill: g.skill_name,
        urgency: skillGapUrgency(g),
        impactedProjects: g.projects_requiring,
        requirementsUncovered: g.requirements_uncovered,
      })),
    };
  },

  getSkillGaps: async () => {
    const { data } = await api.get('/skill-gaps/organization');
    return {
      organizationGaps: data,
    };
  },
};
