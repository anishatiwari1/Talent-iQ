import csv
import json
from collections import defaultdict
from pathlib import Path

EVAL_DIR = Path("c:/Users/HP/Downloads/talentiq_full_project2/TalentIQ/backend/evaluation")
DATA_DIR = EVAL_DIR / "data"

emp_skills = defaultdict(dict)
with open(DATA_DIR / 'employee_skills.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        emp_skills[row['eval_employee_id']][row['skill_name']] = int(row['proficiency_level'])

proj_reqs = defaultdict(list)
with open(DATA_DIR / 'project_requirements.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        proj_reqs[row['eval_project_id']].append(row)

projects = {}
with open(DATA_DIR / 'projects.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        projects[row['eval_project_id']] = int(row['required_team_size'])

results = []

for proj_id, reqs in proj_reqs.items():
    print(f"\nProject {proj_id}")
    team_size = projects[proj_id]
    print(f"Required Team Size: {team_size}")
    for req in reqs:
        s = req['skill_name']
        req_prof = int(req['required_proficiency'])
        has_skill = [e for e, skills in emp_skills.items() if s in skills]
        has_prof = [e for e, skills in emp_skills.items() if s in skills and skills[s] >= req_prof]
        print(f"  - {s} (Prof: {req_prof}, {req['importance']}) -> Total with skill: {len(has_skill)}, Total with req prof: {len(has_prof)}")
