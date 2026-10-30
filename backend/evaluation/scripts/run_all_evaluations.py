import json
from pathlib import Path
import sys
import logging

from eval_seed import seed_eval_data, clean_eval_data
from evaluate_extraction import evaluate_extraction
from evaluate_recommendation import evaluate_recommendations
from evaluate_team_formation import evaluate_teams
from app.database.postgres import SessionLocal

logging.basicConfig(level=logging.INFO)

EVAL_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = EVAL_DIR / "results"

def generate_markdown_report(metrics):
    report = f"""# TalentIQ Research Evaluation Report

## 1. Dataset Description
- **Employees**: 30 evaluation profiles (across Engineering, Data & AI, DevOps, Design, Product).
- **Projects**: 15 evaluation projects with distinct skill requirements and required team sizes.
- **Resumes**: 10 distinct, highly realistic software engineering resumes with varying formats.
- **Availability Data**: 14 active assignments simulating realistic organizational workload and partial availability.

## 2. Experimental Setup
- **Extraction Model**: Local Qwen2.5 3B via Ollama + spaCy/Keyword fallback.
- **Semantic Engine**: SentenceTransformers (`all-MiniLM-L6-v2`) + FAISS for retrieval.
- **Recommendation Algorithm**: Explainable weighted scoring (Skill: 40%, Availability: 20%, Proficiency: 15%, Experience: 15%, Semantic: 10%).
- **Team Formation Algorithm**: Greedy Set Cover maximizing required skill coverage.

## 3. Extraction Results
*Evaluated against manually constructed ground truth matching exact resume text.*

| Metric | Result |
|--------|--------|
| Precision | {metrics['extraction']['precision']:.3f} |
| Recall | {metrics['extraction']['recall']:.3f} |
| F1-score | {metrics['extraction']['f1']:.3f} |

## 4. Recommendation Results
*Evaluated using Precision, Recall, and NDCG at K=5 against 0-3 human relevance labels.*

| Method | Precision@5 | Recall@5 | NDCG@5 |
|--------|-------------|----------|--------|
| Structured Only (Ablation) | {metrics['recommendation']['ablation_structured_only']['precision_at_5']:.3f} | {metrics['recommendation']['ablation_structured_only']['recall_at_5']:.3f} | {metrics['recommendation']['ablation_structured_only']['ndcg_at_5']:.3f} |
| TalentIQ Production | {metrics['recommendation']['production']['precision_at_5']:.3f} | {metrics['recommendation']['production']['recall_at_5']:.3f} | {metrics['recommendation']['production']['ndcg_at_5']:.3f} |

## 5. Team Formation Results
*Evaluated on the ability to fulfill project skill requirements within the required team size constraint.*

| Metric | Result |
|--------|--------|
| Average Skill Coverage | {metrics['team_formation']['average_skill_coverage']:.1f}% |
| Minimum Coverage | {metrics['team_formation']['minimum_skill_coverage']:.1f}% |
| Maximum Coverage | {metrics['team_formation']['maximum_skill_coverage']:.1f}% |

## 6. System Performance
*Real execution times measured directly against the database and local LLM.*

| Operation | Average (s) | Min (s) | Max (s) |
|-----------|-------------|---------|---------|
| Resume Processing | {metrics['performance']['average_resume_processing_time']:.3f} | {metrics['extraction']['performance']['min_time_s']:.3f} | {metrics['extraction']['performance']['max_time_s']:.3f} |
| Recommendation | {metrics['performance']['average_recommendation_time']:.3f} | {metrics['recommendation']['performance']['min_time_s']:.3f} | {metrics['recommendation']['performance']['max_time_s']:.3f} |
| Team Formation | {metrics['performance']['average_team_formation_time']:.3f} | {metrics['team_formation']['performance']['min_time_s']:.3f} | {metrics['team_formation']['performance']['max_time_s']:.3f} |

## 7. Limitations
- Resume processing time depends heavily on the local LLM execution speed.
- Semantic matching handles implicit similarities well but can occasionally dilute structured exact-match requirements if weighted too heavily.
- Team formation uses a greedy approach; while fast, it might not find the global optimal team in extremely complex constraint scenarios.
"""
    
    with open(RESULTS_DIR / "final_report.md", "w") as f:
        f.write(report)
    return report

def main():
    print("Starting TalentIQ Evaluation Suite...")
    RESULTS_DIR.mkdir(exist_ok=True)
    
    try:
        # Seed evaluation data
        seed_eval_data()
        
        # Run evaluations
        ext_metrics = evaluate_extraction()
        rec_metrics = evaluate_recommendations()
        team_metrics = evaluate_teams()
        
        # Aggregate performance
        perf_metrics = {
            "average_resume_processing_time": ext_metrics["performance"]["avg_time_s"],
            "average_recommendation_time": rec_metrics["performance"]["avg_time_s"],
            "average_team_formation_time": team_metrics["performance"]["avg_time_s"]
        }
        
        final_metrics = {
            "extraction": ext_metrics,
            "recommendation": rec_metrics,
            "team_formation": team_metrics,
            "performance": perf_metrics
        }
        
        with open(RESULTS_DIR / "final_metrics.json", "w") as f:
            json.dump(final_metrics, f, indent=2)
            
        report = generate_markdown_report(final_metrics)
        print("\n=== EVALUATION COMPLETE ===")
        print("Final Report generated at evaluation/results/final_report.md")
        
    except Exception as e:
        print(f"Evaluation failed: {e}")
    finally:
        # Clean up
        db = SessionLocal()
        clean_eval_data(db)
        db.close()

if __name__ == "__main__":
    main()
