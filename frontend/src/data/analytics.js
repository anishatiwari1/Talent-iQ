export const mockAnalytics = {
  kpis: {
    totalEmployees: 48,
    availableEmployees: 18,
    activeProjects: 6,
    assignedEmployees: 30,
    averageWorkforceUtilization: 68.5,
    underutilizedEmployees: 7,
    skillGapsIdentified: 14,
    pendingRecommendations: 9
  },
  workforceUtilizationTrend: [
    { month: "Jan", utilization: 62, target: 70 },
    { month: "Feb", utilization: 64, target: 70 },
    { month: "Mar", utilization: 67, target: 70 },
    { month: "Apr", utilization: 65, target: 70 },
    { month: "May", utilization: 71, target: 70 },
    { month: "Jun", utilization: 68.5, target: 70 }
  ],
  workloadDistribution: [
    { range: "0-25% (Low)", count: 7, color: "#10B981" },
    { range: "26-50% (Moderate)", count: 14, color: "#3B82F6" },
    { range: "51-75% (Optimal)", count: 21, color: "#6366F1" },
    { range: "76-100% (High/At Capacity)", count: 6, color: "#EF4444" }
  ],
  departmentBreakdown: [
    { name: "Engineering", employees: 20, activeProjects: 4 },
    { name: "Data & AI", employees: 12, activeProjects: 3 },
    { name: "Cloud Infrastructure", employees: 8, activeProjects: 2 },
    { name: "Product Design", employees: 4, activeProjects: 2 },
    { name: "Security & QA", employees: 4, activeProjects: 2 }
  ],
  topSkillDistribution: [
    { skill: "Python", count: 18 },
    { skill: "React", count: 15 },
    { skill: "Node.js", count: 12 },
    { skill: "Docker", count: 11 },
    { skill: "AWS", count: 10 },
    { skill: "Kubernetes", count: 7 },
    { skill: "Neo4j", count: 4 },
    { skill: "Kafka", count: 5 }
  ],
  organizationSkillGaps: [
    { skill: "Kubernetes", urgency: "High", currentProficiency: "Deficit", impactedProjects: 3, employeesNeeded: 4 },
    { skill: "Docker", urgency: "High", currentProficiency: "Moderate", impactedProjects: 4, employeesNeeded: 3 },
    { skill: "AWS Solutions Architecture", urgency: "Medium", currentProficiency: "Moderate", impactedProjects: 2, employeesNeeded: 2 },
    { skill: "Graph RAG / Neo4j", urgency: "Medium", currentProficiency: "Deficit", impactedProjects: 2, employeesNeeded: 3 },
    { skill: "Machine Learning Evaluation", urgency: "Low", currentProficiency: "Developing", impactedProjects: 1, employeesNeeded: 2 }
  ],
  upskillingRecommendations: [
    { employeeId: "EMP-1001", name: "Aarav Sharma", missingSkill: "Docker", priority: "High", targetTimeline: "4 weeks" },
    { employeeId: "EMP-1002", name: "Dr. Priya Patel", missingSkill: "Docker", priority: "Medium", targetTimeline: "6 weeks" },
    { employeeId: "EMP-1004", name: "Neha Sundaram", missingSkill: "Kubernetes", priority: "High", targetTimeline: "8 weeks" },
    { employeeId: "EMP-1008", name: "Vikram Malhotra", missingSkill: "NLP Model Validation", priority: "Medium", targetTimeline: "5 weeks" }
  ]
};
