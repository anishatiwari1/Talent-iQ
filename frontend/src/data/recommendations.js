export const mockRecommendations = {
  "PRJ-01": [
    {
      employeeId: "EMP-1002",
      name: "Dr. Priya Patel",
      role: "Lead AI/ML Research Engineer",
      department: "Data & AI",
      matchScore: 94,
      skillMatchScore: 96,
      experienceYears: 7.0,
      relevantProjectsCount: 2,
      availability: 60,
      currentWorkload: 65,
      matchedSkills: [
        { name: "Python", score: 98, level: "Expert" },
        { name: "NLP", score: 92, level: "Expert" },
        { name: "Transformers", score: 90, level: "Advanced" }
      ],
      skillGaps: [
        { name: "Docker", missingLevel: "Intermediate (has basic knowledge)" }
      ],
      whyThisMatch: {
        summary: "Priya holds the highest semantic embedding similarity for NLP & transformer architecture required in this project.",
        skillMatchPercent: 96,
        experienceYears: 7.0,
        relevantProjects: 2,
        availabilityPercent: 60,
        currentWorkloadPercent: 65,
        strengths: [
          "Proven track record leading Enterprise Knowledge Extractor project",
          "Deep expertise in PyTorch and vector databases",
          "Available for up to 35% additional allocation without overallocation risk"
        ],
        considerations: [
          "Docker upskilling or pairing with a DevOps engineer is recommended"
        ]
      }
    },
    {
      employeeId: "EMP-1001",
      name: "Aarav Sharma",
      role: "Senior Full Stack Engineer",
      department: "Engineering",
      matchScore: 91,
      skillMatchScore: 92,
      experienceYears: 5.5,
      relevantProjectsCount: 2,
      availability: 80,
      currentWorkload: 40,
      matchedSkills: [
        { name: "React", score: 95, level: "Expert" },
        { name: "Tailwind CSS", score: 92, level: "Expert" },
        { name: "Node.js", score: 88, level: "Advanced" }
      ],
      skillGaps: [
        { name: "FastAPI", missingLevel: "Strong Express/Node background, fast ramp-up expected" }
      ],
      whyThisMatch: {
        summary: "Aarav has 80% availability and top-tier React experience required to build the conversational UI portal.",
        skillMatchPercent: 92,
        experienceYears: 5.5,
        relevantProjects: 2,
        availabilityPercent: 80,
        currentWorkloadPercent: 40,
        strengths: [
          "Available immediately (80% open bandwidth)",
          "Extensive UI component library building experience",
          "Collaborated previously with Data & AI team on PRJ-03"
        ],
        considerations: [
          "Backend API utilizes FastAPI; Aarav will focus primarily on frontend client layer"
        ]
      }
    },
    {
      employeeId: "EMP-1007",
      name: "Samantha Chen",
      role: "MLOps & AI Infrastructure Engineer",
      department: "Data & AI",
      matchScore: 88,
      skillMatchScore: 90,
      experienceYears: 4.5,
      relevantProjectsCount: 1,
      availability: 50,
      currentWorkload: 75,
      matchedSkills: [
        { name: "FastAPI", score: 86, level: "Advanced" },
        { name: "Docker", score: 86, level: "Advanced" },
        { name: "Python", score: 88, level: "Advanced" }
      ],
      skillGaps: [
        { name: "Kubernetes", missingLevel: "Moderate (project requires basic deployment)" }
      ],
      whyThisMatch: {
        summary: "Samantha bridges the model serving layer with FastAPI and Docker containerization.",
        skillMatchPercent: 90,
        experienceYears: 4.5,
        relevantProjects: 1,
        availabilityPercent: 50,
        currentWorkloadPercent: 75,
        strengths: [
          "Expert in MLflow and model containerization",
          "Direct experience deploying FastAPI microservices"
        ],
        considerations: [
          "Workload is currently at 75%; assignment should not exceed 20-25%"
        ]
      }
    },
    {
      employeeId: "EMP-1008",
      name: "Vikram Malhotra",
      role: "Quality Assurance & Test Automation Lead",
      department: "Engineering",
      matchScore: 84,
      skillMatchScore: 82,
      experienceYears: 6.0,
      relevantProjectsCount: 2,
      availability: 70,
      currentWorkload: 50,
      matchedSkills: [
        { name: "API Testing", score: 94, level: "Expert" },
        { name: "Cypress", score: 92, level: "Expert" },
        { name: "JavaScript", score: 82, level: "Advanced" }
      ],
      skillGaps: [
        { name: "NLP Model Validation", missingLevel: "Requires standard LLM evaluation checklist" }
      ],
      whyThisMatch: {
        summary: "Vikram ensures high test coverage for API endpoints and end-to-end user workflows.",
        skillMatchPercent: 82,
        experienceYears: 6.0,
        relevantProjects: 2,
        availabilityPercent: 70,
        currentWorkloadPercent: 50,
        strengths: [
          "Reliable test lead with 6 years experience",
          "Balanced current workload with ample bandwidth"
        ],
        considerations: [
          "New to LLM automated prompt evaluation metrics"
        ]
      }
    }
  ],
  "PRJ-02": [
    {
      employeeId: "EMP-1009",
      name: "Amina Al-Mansoor",
      role: "Graph Database & Neo4j Specialist",
      department: "Data & AI",
      matchScore: 97,
      skillMatchScore: 98,
      experienceYears: 4.0,
      relevantProjectsCount: 1,
      availability: 80,
      currentWorkload: 35,
      matchedSkills: [
        { name: "Neo4j", score: 95, level: "Expert" },
        { name: "Cypher", score: 96, level: "Expert" },
        { name: "Knowledge Graphs", score: 92, level: "Expert" },
        { name: "Graph RAG", score: 88, level: "Advanced" }
      ],
      skillGaps: [],
      whyThisMatch: {
        summary: "Amina is the enterprise domain authority for Neo4j knowledge graphs with perfect skill alignment.",
        skillMatchPercent: 98,
        experienceYears: 4.0,
        relevantProjects: 1,
        availabilityPercent: 80,
        currentWorkloadPercent: 35,
        strengths: [
          "100% core skill match for Neo4j, Cypher, and Graph RAG",
          "High availability (80%) and low current workload (35%)"
        ],
        considerations: []
      }
    }
  ]
};
