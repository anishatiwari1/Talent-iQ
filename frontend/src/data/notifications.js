export const mockNotifications = {
  admin: [
    {
      id: "NOTIF-A01",
      title: "AI Recommendations Generated",
      message: "AI recommendation engine has shortlisted 4 high-match candidates for 'AI Customer Copilot'.",
      timestamp: "10 mins ago",
      type: "recommendation",
      read: false,
      link: "/admin/projects/PRJ-01/recommendations"
    },
    {
      id: "NOTIF-A02",
      title: "Skill Gap Alert: Kubernetes",
      message: "High urgency skill deficit detected. 3 upcoming projects require Kubernetes container orchestration.",
      timestamp: "1 hour ago",
      type: "alert",
      read: false,
      link: "/admin/skill-gaps"
    },
    {
      id: "NOTIF-A03",
      title: "Workload Imbalance Warning",
      message: "Marcus Vance is currently at 85% workload capacity. Consider rebalancing cloud infrastructure tasks.",
      timestamp: "3 hours ago",
      type: "warning",
      read: true,
      link: "/admin/employees/EMP-1003"
    },
    {
      id: "NOTIF-A04",
      title: "Team Formation Pending Approval",
      message: "Proposed 4-member team for 'Enterprise Knowledge Graph' awaiting final Admin decision.",
      timestamp: "Yesterday",
      type: "info",
      read: true,
      link: "/admin/teams"
    }
  ],
  employee: [
    {
      id: "NOTIF-E01",
      title: "Project Assignment Confirmed",
      message: "You have been allocated as Frontend Lead for 'Next-Gen Analytics & TalentIQ Portal' (40% allocation).",
      timestamp: "2 hours ago",
      type: "assignment",
      read: false,
      link: "/employee/projects"
    },
    {
      id: "NOTIF-E02",
      title: "Upskilling Pathway Recommended",
      message: "AI identified 'Docker' as a high-impact development skill based on pipeline project demands.",
      timestamp: "1 day ago",
      type: "development",
      read: false,
      link: "/employee/development"
    },
    {
      id: "NOTIF-E03",
      title: "Monthly Availability Verification",
      message: "Please review and confirm your availability for Q3 project allocations.",
      timestamp: "3 days ago",
      type: "request",
      read: true,
      link: "/employee/availability"
    }
  ]
};
