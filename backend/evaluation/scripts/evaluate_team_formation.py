import json
import time
from pathlib import Path
import logging

from app.database.postgres import SessionLocal
from app.models.project import Project
from app.services.team_service import form_team, get_remaining_gaps

logger = logging.getLogger(__name__)

EVAL_DIR = Path(__file__).resolve().parent.parent
RESULTS_DIR = EVAL_DIR / "results"

def evaluate_teams():
    db = SessionLocal()
    try:
        RESULTS_DIR.mkdir(exist_ok=True)
        db_projects = db.query(Project).filter(Project.name.like("EVAL-%")).all()
        
        results = []
        processing_times = []
        coverages = []
        gaps_counts = []
        
        for project in db_projects:
            team_size = project.required_team_size or 4
            eval_id = project.name.split(" ")[0].replace("EVAL-", "")
            
            start_time = time.time()
            try:
                # the form_team also commits to DB, so we should clean up after or rollback
                # actually, we can just delete the team after evaluation
                team = form_team(db, project, team_size)
            except Exception as e:
                print(f"Error forming team for {eval_id}: {e}")
                continue
            finally:
                processing_times.append(time.time() - start_time)
                
            coverage = team.skill_coverage_percentage
            gaps = get_remaining_gaps(project, team)
            
            coverages.append(coverage)
            gaps_counts.append(len(gaps))
            
            results.append({
                "project": eval_id,
                "team_size": len(team.members),
                "coverage_percentage": coverage,
                "remaining_gaps": len(gaps),
                "gap_skills": gaps
            })
            
            # Clean up team to keep DB tidy
            db.delete(team)
            db.commit()

        avg_coverage = sum(coverages) / len(coverages) if coverages else 0
        min_coverage = min(coverages) if coverages else 0
        max_coverage = max(coverages) if coverages else 0
        avg_gaps = sum(gaps_counts) / len(gaps_counts) if gaps_counts else 0
        
        avg_time = sum(processing_times) / len(processing_times) if processing_times else 0
        min_time = min(processing_times) if processing_times else 0
        max_time = max(processing_times) if processing_times else 0

        summary = {
            "average_skill_coverage": avg_coverage,
            "minimum_skill_coverage": min_coverage,
            "maximum_skill_coverage": max_coverage,
            "average_remaining_gaps": avg_gaps,
            "performance": {
                "avg_time_s": avg_time,
                "min_time_s": min_time,
                "max_time_s": max_time
            }
        }
        
        with open(RESULTS_DIR / "team_results.json", "w") as f:
            json.dump({"summary": summary, "details": results}, f, indent=2)
            
        print(f"Team Eval Complete. Avg Coverage: {avg_coverage:.1f}%")
        return summary
        
    finally:
        db.close()

if __name__ == "__main__":
    evaluate_teams()
