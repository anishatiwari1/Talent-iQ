# TALENTIQ AI - Intelligent Workforce Analytics & Talent Optimization

Frontend architecture for **TalentIQ AI**, an enterprise-grade workforce management and analytics platform designed to analyze employee capabilities, identify hidden skill gaps, and support balanced project team formation.

---

## 🚀 Architecture Highlights

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS with enterprise color design system & dark accents
- **Routing**: React Router DOM (v6) with distinct role layouts:
  - **Admin / Manager Layout**: Strategic workforce management, team formation, skill gap matrix, AI candidate recommendations.
  - **Employee Layout**: Personal capability profile, verified skills, bandwidth management, AI upskilling pathways.
- **Analytics Visualizations**: Recharts (Workforce Utilization Trend, Workload Distributions)
- **Icons**: Lucide React
- **Service Layer**: Clean API abstraction (`src/services/`) ready for seamless FastAPI / PostgreSQL / Neo4j backend integration without UI refactoring.
- **Decision Support Principle**: UI emphasizes that TalentIQ is a decision-support platform (recommendations are generated with explainability, but final allocations are approved by Managers).

---

## 📂 Project Structure

```
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/         # Button, Card, Badge, KPIWidget, WorkloadIndicator, AvailabilityIndicator, PlaceholderView
│   │   ├── layout/         # Sidebar, TopNavbar, PageHeader
│   │   ├── employee/       # Specific employee capability components
│   │   ├── project/        # Project cards & forms
│   │   ├── recommendation/ # AI match scores & "Why this match?" explainability
│   │   ├── team/           # Team formation & balance widgets
│   │   └── analytics/      # Utilization charts
│   ├── context/
│   │   └── AuthContext.jsx # Auth state, role switcher (Admin <-> Employee)
│   ├── data/               # Realistic enterprise mock datasets (employees, projects, recommendations, analytics)
│   ├── layouts/
│   │   ├── AdminLayout.jsx
│   │   └── EmployeeLayout.jsx
│   ├── pages/
│   │   ├── admin/          # AdminDashboard, etc.
│   │   ├── auth/           # Login, Register, ForgotPassword, ResetPassword
│   │   └── employee/       # EmployeeDashboard, etc.
│   ├── routes/
│   │   └── AppRoutes.jsx   # All application routes
│   ├── services/           # api.js, authService, employeeService, projectService, recommendationService, analyticsService
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Run local development server
npm run dev

# 3. Build production bundle
npm run build
```

---

## 👥 Demo Access & Role Switching

TalentIQ supports instant role switching right from the top navigation bar or sidebar:
- **Admin / Manager Mode**: View overall organizational metrics, projects, talent allocations, and skill gaps.
- **Employee Mode**: View individual profile, assignments, and personalized upskilling roadmaps.
