export const mockProjects = [
  {
    id: "PRJ-01",
    name: "AI-Powered Customer Intelligence Copilot",
    description: "Enterprise conversational assistant designed to analyze customer support tickets, suggest automated resolutions, and route high-priority escalations.",
    department: "Data & AI",
    priority: "High",
    status: "Active",
    startDate: "2024-02-01",
    endDate: "2024-08-30",
    teamSize: 5,
    requiredExperience: 3.5,
    requiredSkills: [
      { name: "Python", minScore: 80, importance: "Mandatory" },
      { name: "NLP", minScore: 85, importance: "Mandatory" },
      { name: "React", minScore: 75, importance: "Important" },
      { name: "FastAPI", minScore: 70, importance: "Important" },
      { name: "Docker", minScore: 70, importance: "Nice-to-have" }
    ],
    assignedTeam: [
      { employeeId: "EMP-1002", role: "AI Lead", workloadContribution: 40 },
      { employeeId: "EMP-1008", role: "QA Lead", workloadContribution: 30 }
    ]
  },
  {
    id: "PRJ-02",
    name: "Enterprise Knowledge Graph & Semantic Discovery",
    description: "Constructing an internal knowledge graph indexing corporate documentation, code repositories, and patent filings using Neo4j and vector embeddings.",
    department: "Data & AI",
    priority: "Critical",
    status: "Planning",
    startDate: "2024-04-15",
    endDate: "2024-11-30",
    teamSize: 4,
    requiredExperience: 4.0,
    requiredSkills: [
      { name: "Neo4j", minScore: 85, importance: "Mandatory" },
      { name: "Knowledge Graphs", minScore: 80, importance: "Mandatory" },
      { name: "Python", minScore: 80, importance: "Mandatory" },
      { name: "Graph RAG", minScore: 75, importance: "Important" }
    ],
    assignedTeam: []
  },
  {
    id: "PRJ-03",
    name: "Next-Gen Analytics & TalentIQ Portal",
    description: "Building the scalable workforce intelligence web portal with live dashboards, Recharts analytics, and responsive decision-support interfaces.",
    department: "Engineering",
    priority: "High",
    status: "Active",
    startDate: "2024-01-10",
    endDate: "2024-07-20",
    teamSize: 4,
    requiredExperience: 3.0,
    requiredSkills: [
      { name: "React", minScore: 85, importance: "Mandatory" },
      { name: "Tailwind CSS", minScore: 80, importance: "Mandatory" },
      { name: "Node.js", minScore: 75, importance: "Important" },
      { name: "UI/UX Design", minScore: 70, importance: "Important" }
    ],
    assignedTeam: [
      { employeeId: "EMP-1001", role: "Frontend Lead", workloadContribution: 40 },
      { employeeId: "EMP-1011", role: "Product Manager", workloadContribution: 50 }
    ]
  },
  {
    id: "PRJ-04",
    name: "Automated MLOps Pipeline & Model Serving",
    description: "End-to-end continuous integration and deployment pipeline for fine-tuned LLMs with GPU auto-scaling, latency monitoring, and drift detection.",
    department: "Cloud Infrastructure",
    priority: "Medium",
    status: "Active",
    startDate: "2024-03-01",
    endDate: "2024-09-15",
    teamSize: 3,
    requiredExperience: 4.0,
    requiredSkills: [
      { name: "Kubernetes", minScore: 80, importance: "Mandatory" },
      { name: "Docker", minScore: 80, importance: "Mandatory" },
      { name: "MLflow", minScore: 75, importance: "Important" },
      { name: "AWS", minScore: 75, importance: "Important" }
    ],
    assignedTeam: [
      { employeeId: "EMP-1007", role: "MLOps Engineer", workloadContribution: 45 }
    ]
  },
  {
    id: "PRJ-05",
    name: "Multi-Region Cloud Resilience Migration",
    description: "Migrating on-premise compute nodes to multi-region cloud clusters with high availability, disaster recovery, and automated failover.",
    department: "Cloud Infrastructure",
    priority: "High",
    status: "Active",
    startDate: "2023-11-01",
    endDate: "2024-05-30",
    teamSize: 3,
    requiredExperience: 5.0,
    requiredSkills: [
      { name: "Kubernetes", minScore: 90, importance: "Mandatory" },
      { name: "Terraform", minScore: 80, importance: "Mandatory" },
      { name: "AWS", minScore: 85, importance: "Mandatory" },
      { name: "CI/CD", minScore: 75, importance: "Important" }
    ],
    assignedTeam: [
      { employeeId: "EMP-1003", role: "Cloud Architect", workloadContribution: 60 },
      { employeeId: "EMP-1014", role: "SRE", workloadContribution: 50 }
    ]
  },
  {
    id: "PRJ-06",
    name: "FinTech Transaction Fraud Anomaly Detector",
    description: "Low-latency streaming fraud detection system scanning millions of card transactions per minute with sub-50ms inference deadlines.",
    department: "Engineering",
    priority: "Critical",
    status: "Planning",
    startDate: "2024-05-01",
    endDate: "2024-12-15",
    teamSize: 5,
    requiredExperience: 4.5,
    requiredSkills: [
      { name: "Go", minScore: 85, importance: "Mandatory" },
      { name: "Kafka", minScore: 80, importance: "Mandatory" },
      { name: "PostgreSQL", minScore: 80, importance: "Important" },
      { name: "Redis", minScore: 80, importance: "Important" },
      { name: "Docker", minScore: 70, importance: "Nice-to-have" }
    ],
    assignedTeam: []
  }
];
