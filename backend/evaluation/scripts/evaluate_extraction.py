import csv
import json
import time
from pathlib import Path
from collections import defaultdict
import logging

from app.database.postgres import SessionLocal
from app.models.employee import Employee
from app.models.document import Document
from app.services.extraction_pipeline import process_document
from app.services.skill_service import normalize_skill_name

logger = logging.getLogger(__name__)

EVAL_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = EVAL_DIR / "data"
RESUME_DIR = DATA_DIR / "resumes"
GT_FILE = EVAL_DIR / "ground_truth" / "skill_ground_truth.csv"
RESULTS_DIR = EVAL_DIR / "results"

def load_ground_truth():
    gt = defaultdict(set)
    with open(GT_FILE, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['skill_name']:
                # Normalize skill names for accurate comparison
                skill_canonical = normalize_skill_name(row['skill_name']).casefold()
                gt[row['eval_employee_id']].add(skill_canonical)
    return gt

def evaluate_extraction():
    db = SessionLocal()
    try:
        gt_skills = load_ground_truth()
        RESULTS_DIR.mkdir(exist_ok=True)
        
        results = []
        total_tp = 0
        total_fp = 0
        total_fn = 0
        
        processing_times = []
        
        employees = db.query(Employee).filter(Employee.employee_code.like("EVAL_%")).all()
        emp_map = {e.employee_code.replace("EVAL_", ""): e for e in employees}
        
        for eval_id, expected_skills in gt_skills.items():
            if eval_id not in emp_map:
                continue
                
            emp = emp_map[eval_id]
            resume_path = RESUME_DIR / f"resume_{eval_id}.txt"
            
            if not resume_path.exists():
                print(f"Resume missing for {eval_id}: {resume_path}")
                continue
                
            # Create a mock document record
            doc = Document(
                employee_id=emp.id,
                document_type="RESUME",
                file_name=resume_path.name,
                file_path=str(resume_path),
                file_size_bytes=resume_path.stat().st_size,
                mime_type="text/plain",
                processing_status="PENDING",
                extraction_status="NOT_STARTED"
            )
            db.add(doc)
            db.commit()
            db.refresh(doc)
            
            print(f"Processing resume for {eval_id}...")
            start_time = time.time()
            try:
                extraction_result = process_document(db, doc, emp)
            except Exception as e:
                print(f"Error processing {eval_id}: {e}")
                continue
            finally:
                processing_times.append(time.time() - start_time)
            
            extracted_skills = set()
            if extraction_result.get("llm_persisted") and extraction_result["llm_persisted"].get("skills"):
                for s in extraction_result["llm_persisted"]["skills"]:
                    extracted_skills.add(normalize_skill_name(s).casefold())
            else:
                 # Fallback to NLP if LLM failed
                 for s in extraction_result.get("skills_extracted", []):
                     extracted_skills.add(normalize_skill_name(s).casefold())
            
            tp = len(extracted_skills.intersection(expected_skills))
            fp = len(extracted_skills - expected_skills)
            fn = len(expected_skills - extracted_skills)
            
            total_tp += tp
            total_fp += fp
            total_fn += fn
            
            results.append({
                "eval_employee_id": eval_id,
                "expected": list(expected_skills),
                "extracted": list(extracted_skills),
                "tp": tp,
                "fp": fp,
                "fn": fn
            })
            
            db.delete(doc)
            db.commit()

        precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
        recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        avg_time = sum(processing_times) / len(processing_times) if processing_times else 0
        min_time = min(processing_times) if processing_times else 0
        max_time = max(processing_times) if processing_times else 0
        
        summary = {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "total_processed": len(results),
            "performance": {
                "avg_time_s": avg_time,
                "min_time_s": min_time,
                "max_time_s": max_time
            }
        }
        
        with open(RESULTS_DIR / "extraction_results.json", "w") as f:
            json.dump({"summary": summary, "details": results}, f, indent=2)
            
        print(f"Extraction Eval Complete. P: {precision:.2f}, R: {recall:.2f}, F1: {f1:.2f}")
        return summary
        
    finally:
        db.close()

if __name__ == "__main__":
    evaluate_extraction()
