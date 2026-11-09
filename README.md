# TalentIQ

TalentIQ helps companies pick the **right people for the right projects**.

It looks at each employee's skills, experience and free time, and suggests who should work on which project. It also shows which skills a team is missing.

---

## What can it do?

**For managers**
- See all employees and projects in one dashboard
- Get a ranked list of the best people for a project — with the reason for each pick
- Build a balanced team automatically
- Find skill gaps in a project, a team or the whole company
- Check who is busy and who is free

**For employees**
- Add your skills, certificates and free time
- Upload your resume — skills are filled in automatically
- See which skills to learn next
- Track your projects

---

## How does it work? (in simple words)

1. **Read the resume** — an AI model reads the resume and pulls out skills and experience.
2. **Score each person** for a project:
   - Do they have the required skills? (40%)
   - Are they free? (20%)
   - How good are they at those skills? (15%)
   - How much experience do they have? (15%)
   - How closely does their profile match the project? (10%)
3. **Build a team** — instead of picking the top 5 people (who might all know the same thing), it keeps adding the person who covers a skill the team is still missing.
4. **Show skill gaps** — a skill graph shows which skills are missing and which related skills could fill them.

---

## Built with

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Python, FastAPI
- **Database:** PostgreSQL, plus Neo4j for the skill graph
- **AI:** Ollama (Qwen2.5), spaCy, SentenceTransformers, FAISS

---

## How to run it

### You need
- Python 3.12
- Node.js 18 or newer
- PostgreSQL 16
- *(Optional)* Neo4j 5 — for the skill graph
- *(Optional)* Ollama — for better resume reading

### Step 1 — Download the project

```bash
git clone https://github.com/anishatiwari1/Talent-iQ.git
cd Talent-iQ
```

### Step 2 — Start the backend

1. In PostgreSQL, create an empty database called `talentiq_db`.
2. Inside the `backend` folder, create a file named `.env` and paste this (fill in your passwords):

```env
DATABASE_URL=postgresql+psycopg://postgres:<password>@localhost:5432/talentiq_db
SECRET_KEY=<any long random text>
APP_NAME=TalentIQ
APP_VERSION=1.0.0

# Only needed if you use Neo4j
NEO4J_URI=bolt://127.0.0.1:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<neo4j password>
NEO4J_DATABASE=neo4j
```

3. Open a terminal in the `backend` folder and run:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

> On Mac/Linux, use `source venv/bin/activate` instead of `venv\Scripts\activate`.

The backend is now running at http://127.0.0.1:8000 (API docs: http://127.0.0.1:8000/docs).

**Optional extras**
- Skill graph: start Neo4j, then run `python -m scripts.sync_neo4j`
- Better resume reading: install [Ollama](https://ollama.com), then run `ollama pull qwen2.5:3b`

### Step 3 — Start the frontend

Open a second terminal in the `frontend` folder and run:

```bash
npm install
npm run dev
```

Now open **http://localhost:3000** in your browser.

---

## Login to try it

| Role | Email | Password |
|---|---|---|
| Manager | `manager@talentiq.dev` | `Password123!` |
| Employee | any sample employee from `backend/app/seed.py` | `Password123!` |

---

## Project folders

```
frontend/   → the website (React)
backend/    → the server and AI logic (FastAPI)
docs/       → notes and documentation
```

---

## Having trouble?

- **Database error** → check PostgreSQL is running and the password in `.env` is correct.
- **Skill graph is empty** → start Neo4j and run `python -m scripts.sync_neo4j`.
- **Website can't load data** → make sure the backend is running on port 8000.

---

## License

MIT License — see the [LICENSE](LICENSE) file.
