"""Explainable employee-to-project recommendation engine (Phase 8).

Scoring is a transparent weighted sum of independently-computed
sub-scores. Every sub-score and the final score are stored on the
Recommendation row (contributing_factors JSON) exactly as computed --
nothing is post-hoc reconstructed for display. Weights are named
constants (not buried magic numbers) so they can be tuned or exposed
as admin settings later without touching the scoring logic itself.

This deliberately does NOT auto-create an Assignment. Recommendations
are proposals; assignment_service.approve_recommendation() is the only
path that turns one into a real staffing change, and that always
requires a manager's explicit action (Phase 12).
"""
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.recommendation import Recommendation
from app.services import embedding_service, employee_service

logger = logging.getLogger("talentiq.recommendations")

# Weights sum to 1.0. Adjust here -- and only here -- to retune scoring.
WEIGHT_SKILL_MATCH = 0.40
WEIGHT_PROFICIENCY = 0.15
WEIGHT_EXPERIENCE = 0.15
WEIGHT_SEMANTIC = 0.10
WEIGHT_AVAILABILITY = 0.20

IMPORTANCE_WEIGHT = {"MUST_HAVE": 3, "IMPORTANT": 2, "NICE_TO_HAVE": 1}


def _skill_match_score(employee_skills: dict[int, EmployeeSkill], required: list[ProjectSkill]) -> tuple[float, list[str], list[str], float]:
    if not required:
        return 100.0, [], [], 100.0

    total_weight = sum(IMPORTANCE_WEIGHT.get(r.importance, 2) for r in required)
    matched_weight = 0.0
    proficiency_ratios = []
    matched_names, missing_names = [], []

    for req in required:
        weight = IMPORTANCE_WEIGHT.get(req.importance, 2)
        emp_skill = employee_skills.get(req.skill_id)
        if emp_skill:
            matched_weight += weight
            matched_names.append(req.skill.name)
            ratio = min(emp_skill.proficiency_level / max(req.required_proficiency, 1), 1.0)
            proficiency_ratios.append(ratio)
        else:
            missing_names.append(req.skill.name)

    skill_match_pct = round((matched_weight / total_weight) * 100, 1) if total_weight else 0.0
    proficiency_pct = round((sum(proficiency_ratios) / len(required)) * 100, 1) if required else 0.0

    return skill_match_pct, matched_names, missing_names, proficiency_pct


def _experience_score(employee: Employee, required_skills: list[ProjectSkill], employee_skills: dict[int, EmployeeSkill]) -> float:
    if not required_skills:
        return min(employee.experience_years / 5, 1.0) * 100

    relevant_years = [
        employee_skills[r.skill_id].years_of_experience
        for r in required_skills if r.skill_id in employee_skills
    ]
    if not relevant_years:
        return 0.0
    avg_relevant = sum(relevant_years) / len(relevant_years)
    return round(min(avg_relevant / 5, 1.0) * 100, 1)  # 5+ yrs relevant = full score


def project_window(start_date: Optional[date], end_date: Optional[date]) -> tuple[date, date]:
    """The date window a project's availability is judged over."""
    if start_date is None and end_date is None:
        # Projects without dates use today's capacity as a reasonable default.
        today = date.today()
        return today, today
    return start_date or end_date, end_date or start_date


def get_project_availability(db: Session, employee: Employee, project: Project) -> dict:
    window_start, window_end = project_window(project.start_date, project.end_date)
    return employee_service.get_availability_for_window(
        db, employee.id, window_start, window_end
    )


def available_capacity_percentage(
    db: Session,
    employee: Employee,
    project: Project,
    availability_result: Optional[dict] = None,
) -> Optional[float]:
    result = availability_result or get_project_availability(db, employee, project)
    return result["remaining_capacity"]


def _availability_score(
    db: Session,
    employee: Employee,
    project: Project,
    availability_result: Optional[dict] = None,
) -> tuple[float, Optional[float], Optional[float], bool]:
    result = availability_result or get_project_availability(db, employee, project)
    if result["data_quality"] == "unknown":
        return 50.0, None, None, True

    utilization = result["peak_allocation"]
    free_capacity = available_capacity_percentage(db, employee, project, result)
    return free_capacity, utilization, free_capacity, False


def score_employee_for_project(
    db: Session,
    employee: Employee,
    project: Project,
    availability_result: Optional[dict] = None,
) -> dict:
    required_skills = list(project.project_skills)
    employee_skills = {es.skill_id: es for es in employee.employee_skills}

    skill_match_pct, matched, missing, proficiency_pct = _skill_match_score(
        employee_skills, required_skills
    )
    experience_pct = _experience_score(employee, required_skills, employee_skills)
    availability_pct, utilization_pct, free_capacity_pct, capacity_unknown = _availability_score(
        db, employee, project, availability_result
    )

    semantic_similarity: Optional[float] = None
    if embedding_service.is_enabled():
        try:
            skill_names = [es.skill.name for es in employee.employee_skills]
            emp_vec = embedding_service.embed_text(
                embedding_service.profile_text(
                    employee.job_title, employee.department, skill_names, employee.bio
                )
            )
            req_names = [ps.skill.name for ps in required_skills]
            proj_vec = embedding_service.embed_text(
                embedding_service.requirement_text(project.description, req_names)
            )
            if emp_vec is not None and proj_vec is not None:
                import numpy as np
                semantic_similarity = round(
                    float(np.dot(emp_vec, proj_vec)) * 100, 1
                )
        except Exception as exc:
            logger.warning("Semantic similarity computation failed: %s", exc)

    semantic_component = semantic_similarity if semantic_similarity is not None else skill_match_pct

    overall = (
        skill_match_pct * WEIGHT_SKILL_MATCH
        + proficiency_pct * WEIGHT_PROFICIENCY
        + experience_pct * WEIGHT_EXPERIENCE
        + semantic_component * WEIGHT_SEMANTIC
        + availability_pct * WEIGHT_AVAILABILITY
    )
    overall = round(overall, 1)

    factors = {
        "skill_match_percentage": skill_match_pct,
        "proficiency_match_percentage": proficiency_pct,
        "experience_match_percentage": experience_pct,
        "semantic_similarity_percentage": semantic_similarity,
        "current_utilization_percentage": utilization_pct,
        "available_capacity_percentage": free_capacity_pct,
        "capacity_unknown": capacity_unknown,
        "matched_skills": matched,
        "missing_skills": missing,
        "weights_used": {
            "skill_match": WEIGHT_SKILL_MATCH,
            "proficiency": WEIGHT_PROFICIENCY,
            "experience": WEIGHT_EXPERIENCE,
            "semantic": WEIGHT_SEMANTIC,
            "availability": WEIGHT_AVAILABILITY,
        },
    }

    reason_parts = [f"{len(matched)}/{len(required_skills)} required skills matched" if required_skills else "No specific skills required"]
    if missing:
        reason_parts.append(f"missing: {', '.join(missing)}")
    if capacity_unknown:
        reason_parts.append("availability data missing; capacity factor is neutral")
    else:
        reason_parts.append(f"{free_capacity_pct}% available capacity")
    reason = "; ".join(reason_parts)

    return {
        "score": overall,
        "matched_skills": matched,
        "missing_skills": missing,
        "reason": reason,
        "contributing_factors": factors,
    }


def get_latest_recommendations(db: Session, project: Project) -> list[Recommendation]:
    """The most recently generated batch for a project, best first.

    A batch is every row written within a minute of the newest one
    (generate_recommendations writes a batch in a single commit). Ranks
    are renumbered by score so the list always reads highest-first.
    """
    latest = db.scalar(
        select(Recommendation.generated_at)
        .where(Recommendation.project_id == project.id)
        .order_by(Recommendation.generated_at.desc())
        .limit(1)
    )
    if latest is None:
        return []

    rows = db.scalars(
        select(Recommendation)
        .options(joinedload(Recommendation.employee).joinedload(Employee.user))
        .where(
            Recommendation.project_id == project.id,
            Recommendation.generated_at >= latest - timedelta(minutes=1),
        )
        .order_by(Recommendation.score.desc(), Recommendation.id.desc())
    ).all()

    seen, batch = set(), []
    for rec in rows:
        if rec.employee_id in seen:
            continue
        seen.add(rec.employee_id)
        batch.append(rec)
    for rank, rec in enumerate(batch, start=1):
        rec.rank = rank
    return batch


def capacity_for_project(db: Session, employee: Employee, project: Project) -> Optional[float]:
    """Free capacity over the project window, not counting the employee's
    own existing allocation to this same project (re-staffing someone
    who is already on the project shouldn't make them look full)."""
    result = get_project_availability(db, employee, project)
    if result["data_quality"] != "ok":
        return None
    own = sum(
        ep.allocation_percentage
        for ep in employee.employee_projects
        if ep.project_id == project.id and ep.status == "ACTIVE"
    )
    return min(100.0, result["remaining_capacity"] + own)


def generate_recommendations(
    db: Session, project: Project, top_n: int = 10
) -> list[Recommendation]:
    """
    Generate explainable employee recommendations for a project.

    Pipeline:
        1. Load all active employees.
        2. Build employee profile embeddings.
        3. Use FAISS to retrieve semantically relevant candidates.
        4. Add employees matching MUST_HAVE skills so exact requirements
           are not accidentally excluded by semantic retrieval.
        5. Run the existing detailed TalentIQ scoring on those candidates.
        6. Rank and persist the top recommendations.

    FAISS is used as a candidate-retrieval layer.
    The final recommendation is still determined by the weighted
    explainable scoring system.
    """

    employees = db.scalars(
        select(Employee)
        .options(
            joinedload(Employee.employee_skills).joinedload(EmployeeSkill.skill),
            joinedload(Employee.availability),
        )
        .where(Employee.is_active == True)  # noqa: E712
    ).unique().all()

    if not employees:
        return []

    # ---------------------------------------------------------
    # STEP 1: Build employee profile embeddings
    # ---------------------------------------------------------
    semantic_candidates = {}
    print(">>> FAISS SECTION ENTERED:", embedding_service.is_enabled())

    if embedding_service.is_enabled():
        try:
            employee_vectors = []
            employee_ids = []

            for employee in employees:
                skill_names = [
                    es.skill.name
                    for es in employee.employee_skills
                    if es.skill is not None
                ]

                profile = embedding_service.profile_text(
                    employee.job_title,
                    employee.department,
                    skill_names,
                    employee.bio,
                )

                vector = embedding_service.embed_text(profile)

                if vector is not None:
                    employee_vectors.append(vector)
                    employee_ids.append(employee.id)

            # -------------------------------------------------
            # STEP 2: Build FAISS index
            # -------------------------------------------------
            index_bundle = embedding_service.build_index(
                employee_vectors,
                employee_ids,
            )

            # -------------------------------------------------
            # STEP 3: Embed project requirements
            # -------------------------------------------------
            required_skills = list(project.project_skills)

            required_skill_names = [
                ps.skill.name
                for ps in required_skills
                if ps.skill is not None
            ]

            project_text = embedding_service.requirement_text(
                project.description,
                required_skill_names,
            )

            project_vector = embedding_service.embed_text(project_text)

            if index_bundle is not None and project_vector is not None:
                # Retrieve a larger candidate pool than top_n.
                #
                # Example:
                # top_n = 10
                # FAISS retrieves up to 50 candidates.
                #
                # This prevents the semantic retrieval stage from
                # becoming too restrictive.
                retrieval_k = min(
                    len(employee_ids),
                    max(top_n * 5, 50),
                )

                faiss_results = embedding_service.search(
                    index_bundle,
                    project_vector,
                    top_k=retrieval_k,
                )
                print(">>> FAISS SEARCH RESULTS:", faiss_results)

                for employee_id, similarity in faiss_results:
                    semantic_candidates[employee_id] = similarity

                logger.info(
                    "FAISS candidate retrieval project_id=%s "
                    "employees_indexed=%d candidates_retrieved=%d",
                    project.id,
                    len(employee_ids),
                    len(faiss_results),
                )

        except Exception as exc:
            logger.warning(
                "FAISS semantic candidate retrieval failed: %s",
                exc,
            )

    # ---------------------------------------------------------
    # STEP 4: Always include employees matching MUST_HAVE skills
    # ---------------------------------------------------------
    must_have_skill_ids = {
        ps.skill_id
        for ps in project.project_skills
        if ps.importance == "MUST_HAVE"
    }

    candidate_ids = set(semantic_candidates.keys())

    if must_have_skill_ids:
        for employee in employees:
            employee_skill_ids = {
                es.skill_id
                for es in employee.employee_skills
            }

            if employee_skill_ids & must_have_skill_ids:
                candidate_ids.add(employee.id)

    # If semantic retrieval is unavailable, fall back to all employees.
    if not candidate_ids:
        candidate_ids = {employee.id for employee in employees}

    candidate_employees = [
        employee
        for employee in employees
        if employee.id in candidate_ids
    ]

    logger.info(
        "recommendation_candidates project_id=%s "
        "total_employees=%d candidate_pool=%d",
        project.id,
        len(employees),
        len(candidate_employees),
    )

    # ---------------------------------------------------------
    # STEP 5: Run the existing detailed TalentIQ scoring
    # ---------------------------------------------------------
    scored = []

    for employee in candidate_employees:
        result = score_employee_for_project(
            db,
            employee,
            project,
        )

        # Store the FAISS similarity for logging/debugging.
        if employee.id in semantic_candidates:
            result["faiss_similarity_percentage"] = round(
                semantic_candidates[employee.id],
                1,
            )

        scored.append((employee, result))

    # ---------------------------------------------------------
    # STEP 6: Rank final recommendations
    # ---------------------------------------------------------
    scored.sort(
        key=lambda pair: pair[1]["score"],
        reverse=True,
    )

    scored = scored[:top_n]

    # ---------------------------------------------------------
    # STEP 7: Persist recommendation results
    # ---------------------------------------------------------
    recommendations = []

    for rank, (employee, result) in enumerate(scored, start=1):
        rec = Recommendation(
            employee_id=employee.id,
            project_id=project.id,
            score=result["score"],
            rank=rank,
            reason=result["reason"],
            contributing_factors=result["contributing_factors"],
            status="PENDING_REVIEW",
            generated_at=datetime.utcnow(),
        )

        db.add(rec)
        recommendations.append(rec)

    db.commit()

    for rec in recommendations:
        db.refresh(rec)

    logger.info(
        "recommendation_generated project_id=%s "
        "candidates_scored=%d top_n=%d",
        project.id,
        len(candidate_employees),
        len(recommendations),
    )

    return recommendations

