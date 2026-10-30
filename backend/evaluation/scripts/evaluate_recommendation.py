import csv
import json
import time
import math
from pathlib import Path
from collections import defaultdict
import logging

from app.database.postgres import SessionLocal
from app.models.employee import Employee
from app.models.project import Project
from app.services.recommendation_service import generate_recommendations
from app.services import recommendation_service

logger = logging.getLogger(__name__)

EVAL_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = EVAL_DIR / "data"
GT_FILE = EVAL_DIR / "ground_truth" / "recommendation_ground_truth.csv"
RESULTS_DIR = EVAL_DIR / "results"

def load_ground_truth():
    gt = defaultdict(dict)
    with open(GT_FILE, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            gt[row['eval_project_id']][row['eval_employee_id']] = int(row['relevance'])
    return gt

def dcg_at_k(relevances, k):
    dcg = 0.0
    for i, rel in enumerate(relevances[:k]):
        dcg += (math.pow(2, rel) - 1) / math.log2(i + 2)
    return dcg

def ndcg_at_k(retrieved_relevances, ideal_relevances, k):
    dcg = dcg_at_k(retrieved_relevances, k)
    idcg = dcg_at_k(sorted(ideal_relevances, reverse=True), k)
    if idcg == 0:
        return 0.0
    return dcg / idcg

def evaluate_run(db, projects, emp_map, gt_relevance, k=5):
    total_p = 0
    total_r = 0
    total_ndcg = 0
    valid_projects = 0
    processing_times = []
    
    results = []
    
    for eval_id, proj_id in projects.items():
        if eval_id not in gt_relevance:
            continue
            
        project = db.get(Project, proj_id)
        if not project:
            continue
            
        start_time = time.time()
        try:
            recs = generate_recommendations(db, project, top_n=max(k, 10))
        except Exception as e:
            print(f"Error generating recs for {eval_id}: {e}")
            continue
        finally:
            processing_times.append(time.time() - start_time)
            
        retrieved_eval_ids = []
        for rec in recs:
            # Reverse lookup eval_id
            for e_eval, e_id in emp_map.items():
                if e_id == rec.employee_id:
                    retrieved_eval_ids.append(e_eval)
                    break
        
        project_gt = gt_relevance[eval_id]
        
        # Relevant means rel > 0
        relevant_in_top_k = sum(1 for e in retrieved_eval_ids[:k] if project_gt.get(e, 0) > 0)
        total_relevant = sum(1 for rel in project_gt.values() if rel > 0)
        
        p_at_k = relevant_in_top_k / k
        r_at_k = relevant_in_top_k / total_relevant if total_relevant > 0 else 0
        
        retrieved_rels = [project_gt.get(e, 0) for e in retrieved_eval_ids[:k]]
        ideal_rels = list(project_gt.values())
        
        ndcg = ndcg_at_k(retrieved_rels, ideal_rels, k)
        
        total_p += p_at_k
        total_r += r_at_k
        total_ndcg += ndcg
        valid_projects += 1
        
        results.append({
            "project": eval_id,
            "p_at_k": p_at_k,
            "r_at_k": r_at_k,
            "ndcg": ndcg,
            "retrieved": retrieved_eval_ids[:k]
        })
        
    if valid_projects == 0:
        return 0, 0, 0, [], results
        
    return total_p / valid_projects, total_r / valid_projects, total_ndcg / valid_projects, processing_times, results

def evaluate_recommendations():
    db = SessionLocal()
    try:
        gt_relevance = load_ground_truth()
        RESULTS_DIR.mkdir(exist_ok=True)
        
        # Map eval codes to real IDs
        employees = db.query(Employee).filter(Employee.employee_code.like("EVAL_%")).all()
        emp_map = {e.employee_code.replace("EVAL_", ""): e.id for e in employees}
        
        db_projects = db.query(Project).filter(Project.name.like("EVAL-%")).all()
        proj_map = {p.name.split(" ")[0].replace("EVAL-", ""): p.id for p in db_projects}
        
        # 1. Standard Production Run
        print("Running standard recommendation evaluation...")
        p, r, ndcg, times, details = evaluate_run(db, proj_map, emp_map, gt_relevance)
        
        # 2. Ablation: Structured Only
        print("Running ablation: Structured Only...")
        orig_weights = {
            "SKILL": recommendation_service.WEIGHT_SKILL_MATCH,
            "PROFICIENCY": recommendation_service.WEIGHT_PROFICIENCY,
            "EXPERIENCE": recommendation_service.WEIGHT_EXPERIENCE,
            "SEMANTIC": recommendation_service.WEIGHT_SEMANTIC,
            "AVAILABILITY": recommendation_service.WEIGHT_AVAILABILITY
        }
        
        # Disable semantic
        recommendation_service.WEIGHT_SEMANTIC = 0.0
        recommendation_service.WEIGHT_SKILL_MATCH = 0.45
        recommendation_service.WEIGHT_PROFICIENCY = 0.20
        recommendation_service.WEIGHT_EXPERIENCE = 0.15
        recommendation_service.WEIGHT_AVAILABILITY = 0.20
        
        p_struct, r_struct, ndcg_struct, _, details_struct = evaluate_run(db, proj_map, emp_map, gt_relevance)
        
        # Restore weights
        recommendation_service.WEIGHT_SKILL_MATCH = orig_weights["SKILL"]
        recommendation_service.WEIGHT_PROFICIENCY = orig_weights["PROFICIENCY"]
        recommendation_service.WEIGHT_EXPERIENCE = orig_weights["EXPERIENCE"]
        recommendation_service.WEIGHT_SEMANTIC = orig_weights["SEMANTIC"]
        recommendation_service.WEIGHT_AVAILABILITY = orig_weights["AVAILABILITY"]
        
        
        avg_time = sum(times) / len(times) if times else 0
        min_time = min(times) if times else 0
        max_time = max(times) if times else 0
        
        summary = {
            "production": {
                "precision_at_5": p,
                "recall_at_5": r,
                "ndcg_at_5": ndcg
            },
            "ablation_structured_only": {
                "precision_at_5": p_struct,
                "recall_at_5": r_struct,
                "ndcg_at_5": ndcg_struct
            },
            "performance": {
                "avg_time_s": avg_time,
                "min_time_s": min_time,
                "max_time_s": max_time
            }
        }
        
        with open(RESULTS_DIR / "recommendation_results.json", "w") as f:
            json.dump({"summary": summary, "details": details}, f, indent=2)
            
        print(f"Rec Eval Complete. P@5: {p:.2f}, R@5: {r:.2f}, NDCG@5: {ndcg:.2f}")
        return summary
        
    finally:
        db.close()

if __name__ == "__main__":
    evaluate_recommendations()
