# TalentIQ

**AI-powered workforce intelligence platform** — match the right people to the right projects using skill data, resumes, availability and a skill knowledge graph.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-5-4581C3?logo=neo4j&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## Overview

Staffing projects usually comes down to spreadsheets and guesswork. TalentIQ replaces that with explainable, data-driven decisions:

- **Managers** get ranked candidate recommendations for each project, AI-assisted team formation, skill-gap analysis and a live view of team workload.
- **Employees** keep their skills, certifications and availability up to date, upload a resume to auto-extract skills, follow a development roadmap and track their project work.

Every recommendation shows *why* a person was suggested — no black-box scores.

## Features

### For managers
| Feature | What it does |
|---|---|
| **Dashboard** | KPIs for headcount, active projects, utilisation and availability. |
| **Employee directory** | Search and filter employees by department, skills and availability. |
| **Projects** | Create projects, define required skills (must-have / important / nice-to-have), move them through stages, archive them. |
| **Recommendations** | Ranked candidates per project with a full score breakdown. |
| **AI team formation** | Proposes a balanced team that covers the project's required skills; swap, add or remove members, then approve or reject. |
| **Skill gaps** | Gap analysis per project, per team and across the organisation, plus related-skill suggestions and an interactive Neo4j graph view. |
| **Workforce analytics** | Organisation-wide workload, utilisation and skill distribution. |

### For employees
| Feature | What it does |
|---|---|
| **Self-service profile** | Manage skills and proficiency, certifications (with proof documents) and avatar. |
| **Resume upload** | Upload a PDF/DOCX resume; skills, experience and projects are extracted automatically for review. |
| **Availability & workload** | Set availability windows and see your current allocation. |
| **Development roadmap** | Personalised skill-development suggestions. |
| **My projects** | Current assignments and delivered project history. |

### Platform
- JWT authentication with role-based access (`MANAGER` / `EMPLOYEE`) enforced on both frontend routes and backend endpoints
- In-app notifications for assignments and team decisions
- Light/dark settings and user preferences

## How the AI works

```
Resume (PDF/DOCX)
   │
   ├─► Local LLM (Ollama · Qwen2.5 3B) ── structured skill/experience extraction
   │        └─ fallback: spaCy + keyword matching
   ▼
Skills normalised (aliases) ─► PostgreSQL ─► Neo4j skill graph
                                   │
Project requirements ──────────────┤
                                   ▼
          Recommendation engine (weighted, explainable)
                                   ▼
          Team formation (greedy set cover) ─► Skill-gap analysis
```

**Recommendation score** — a transparent weighted sum of independently computed components:

| Component | Weight |
|---|---|
| Skill match (weighted by requirement importance) | 40% |
| Availability | 20% |
| Proficiency | 15% |
| Experience | 15% |
| Semantic similarity (SentenceTransformers `all-MiniLM-L6-v2` + FAISS) | 10% |

**Team formation** doesn't just take the top-N individuals (which could give you five Python experts and no React developer). It repeatedly adds the candidate who covers the most still-uncovered, importance-weighted requirement until the team reaches its target size or every requirement is covered.

**Skill graph** — Neo4j models skills, their relationships and who has them, powering related-skill suggestions and the graph view in Skill Gaps.

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router, Axios, Recharts, Framer Motion, lucide-react |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, python-jose (JWT), passlib + bcrypt |
| Databases | PostgreSQL 16 (primary), Neo4j 5 (skill graph) |
| AI / NLP | Ollama (Qwen2.5 3B), spaCy, SentenceTransformers, FAISS, pypdf, python-docx |

## Project structure

```
Talentiq/
├── frontend/                 React + Vite + Tailwind client
│   └── src/
│       ├── pages/            admin/, employee/, auth/ and shared pages
│       ├── components/       Reusable UI (cards, KPI widgets, layout)
│       ├── layouts/          Manager and employee app shells
│       ├── services/         API clients (Axios)
│       ├── context/          Auth state
│       └── routes/           Route table + role guards
├── backend/
│   ├── app/
│   │   ├── api/routes/       REST endpoints (/api/v1/...)
│   │   ├── services/         Business logic, AI/NLP, graph, scoring
│   │   ├── models/           SQLAlchemy models
│   │   ├── schemas/          Pydantic request/response models
│   │   ├── core/             Security, JWT, role dependencies
│   │   ├── alembic/          Database migrations
│   │   └── seed.py           Demo data
│   ├── scripts/              Neo4j sync, data backfills
│   ├── tests/  tests_unit/   Pytest suites
│   └── evaluation/           Research evaluation scripts and results
└── docs/                     Project documentation and design notes
```

## Requirements

| Tool | Version | Needed for |
|---|---|---|
| Python | 3.12 | Backend |
| Node.js | 18+ | Frontend |
| PostgreSQL | 16 | Main database |
| Neo4j | 5 | *Optional* — Skill Gaps graph view and related-skill suggestions |
| Ollama | latest | *Optional* — LLM resume extraction (falls back to spaCy/keywords without it) |

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/anishatiwari1/Talent-iQ.git
cd Talent-iQ
```

### 2. Backend

Create an empty `talentiq_db` database in PostgreSQL, then create `backend/.env`:

```env
# Required
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/talentiq_db
SECRET_KEY=<any long random string>
APP_NAME=TalentIQ
APP_VERSION=1.0.0

# Optional – Neo4j skill graph
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<neo4j password>
NEO4J_DATABASE=neo4j

# Optional – local LLM resume extraction (defaults shown)
OLLAMA_HOST=http://localhost:11434
LLM_MODEL=qwen2.5:3b
```

Install dependencies, run migrations, seed demo data and start the API (from `backend/`):

**Windows**
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

**macOS / Linux**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The API runs at http://127.0.0.1:8000 and interactive docs are at **http://127.0.0.1:8000/docs**.

#### Optional: Neo4j skill graph

With Neo4j running and the `NEO4J_*` variables set:

```bash
python -m scripts.sync_neo4j
```

#### Optional: local LLM extraction

Install [Ollama](https://ollama.com), then:

```bash
ollama pull qwen2.5:3b
```

### 3. Frontend

From `frontend/`:

```bash
npm install
npm run dev
```

Open **http://localhost:3000**. The frontend expects the API at `http://127.0.0.1:8000` — override it with `VITE_API_URL` in `frontend/.env`.

## Demo accounts

`python -m app.seed` creates:

| Role | Email | Password |
|---|---|---|
| Manager | `manager@talentiq.dev` | `Password123!` |
| Employees | several sample employees (see `backend/app/seed.py`) | `Password123!` |

> These are development credentials only — change or remove them before deploying anywhere public.

## API overview

All endpoints are under `/api/v1` and documented at `/docs`.

| Prefix | Purpose |
|---|---|
| `/auth` | Register, login, current user, password, preferences |
| `/employees` | Directory, profiles, skills, certifications, availability, workload |
| `/skills` | Skill catalogue |
| `/projects` | Project CRUD, stages, staffing |
| `/documents` | Resume/document upload, processing and download |
| `/recommendations` | Generate and list candidate recommendations |
| `/team-matching` | AI team proposals, member swaps, approve/reject |
| `/skill-gaps` | Project, team, organisation and graph gap analysis |
| `/assignments` | Assign recommended employees to projects |
| `/notifications` | In-app notifications |
| `/workforce` | Organisation-wide analytics |

## Testing

From `backend/` with the virtual environment active:

```bash
pytest tests_unit      # fast unit tests (scoring rules, skill relations, graph gaps)
pytest                 # integration tests (needs the PostgreSQL database)
```

## Evaluation

`backend/evaluation/` contains a reproducible evaluation of the AI pipeline on 30 employee profiles, 15 projects and 10 resumes. Headline results:

| Area | Metric | Result |
|---|---|---|
| Resume extraction | F1-score | 0.951 |
| Recommendations | NDCG@5 | 0.826 |
| Team formation | Avg. required-skill coverage | 100% |

Full details are in [`backend/evaluation/results/final_report.md`](backend/evaluation/results/final_report.md). To rerun, from `backend/`:

```bash
python evaluation/scripts/run_all_evaluations.py
```

## Troubleshooting

- **`alembic upgrade head` fails to connect** — check that PostgreSQL is running, `talentiq_db` exists and `DATABASE_URL` in `backend/.env` is correct.
- **Skill Gaps graph is empty** — start Neo4j, set the `NEO4J_*` variables and run `python -m scripts.sync_neo4j`.
- **Resume extraction is slow or basic** — without Ollama the app falls back to spaCy/keyword extraction; install Ollama and pull `qwen2.5:3b` for better results.
- **Frontend can't reach the API** — make sure the backend is on port 8000, or set `VITE_API_URL`.

## License

This project is licensed under the MIT License. See the [`LICENSE`](LICENSE) file for details.
