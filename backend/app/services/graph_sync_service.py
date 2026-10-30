"""PostgreSQL to Neo4j Graph Synchronization Service (Phase 2).

This service reads entity records and relationships from PostgreSQL (the single
source of truth) and creates/updates the corresponding nodes and relationships
in Neo4j using idempotent Cypher MERGE operations.

Key safety & design principles:
- PostgreSQL is strictly read-only: no records or schemas in PostgreSQL are modified.
- Neo4j writes are fully idempotent via MERGE on stable PostgreSQL primary keys (`id`).
- Uniqueness constraints are enforced on (:Employee {id}), (:Skill {id}), (:Project {id}), (:Certification {id}).
- Transactions: Synchronizations run inside an explicit Neo4j Managed Transaction (`session.execute_write`).
  Any error during the batch sync triggers an automatic rollback of graph writes.
- Parameterized batching using Cypher `UNWIND` is used for high efficiency and atomicity.
- Stale Data Note: This synchronization is additive and updates in-place. If an entity or relationship
  is deleted in PostgreSQL, it is not automatically purged in Neo4j without an explicit prune step.
"""
import logging
from datetime import date, datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session, joinedload

from app.models.employee import Employee
from app.models.skill import Skill
from app.models.employee_skill import EmployeeSkill
from app.models.project import Project
from app.models.project_skill import ProjectSkill
from app.models.employee_project import EmployeeProject
from app.models.certification import Certification
from app.models.skill_relation import SkillRelation
from app.services import graph_service

logger = logging.getLogger("talentiq.graph_sync")

# Constraints to enforce uniqueness on stable PostgreSQL primary keys
CONSTRAINT_QUERIES = [
    "CREATE CONSTRAINT employee_id_unique IF NOT EXISTS FOR (e:Employee) REQUIRE e.id IS UNIQUE",
    "CREATE CONSTRAINT skill_id_unique IF NOT EXISTS FOR (s:Skill) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT project_id_unique IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
    "CREATE CONSTRAINT certification_id_unique IF NOT EXISTS FOR (c:Certification) REQUIRE c.id IS UNIQUE",
]


def ensure_constraints() -> Dict[str, Any]:
    """Ensure uniqueness constraints exist in Neo4j.
    Safe and idempotent (IF NOT EXISTS).
    """
    if not graph_service.is_enabled():
        return {"status": "error", "message": "Neo4j driver is not enabled."}

    driver = graph_service._driver
    database = graph_service._database

    created = []
    with driver.session(database=database) as session:
        for query in CONSTRAINT_QUERIES:
            session.run(query)
            created.append(query)

    logger.info("Ensured Neo4j uniqueness constraints: %d applied", len(created))
    return {"status": "success", "constraints_ensured": len(created)}


# -------------------------------------------------------------------------
# Batch Synchronization Functions (Executed inside a Neo4j Transaction)
# -------------------------------------------------------------------------

def sync_skills_tx(tx, skills_data: List[Dict[str, Any]]) -> int:
    """Sync skills in batch using UNWIND."""
    if not skills_data:
        return 0
    query = """
    UNWIND $batch AS row
    MERGE (s:Skill {id: row.id})
    SET s.name = row.name,
        s.category = row.category
    """
    tx.run(query, batch=skills_data)
    return len(skills_data)


def sync_employees_tx(tx, employees_data: List[Dict[str, Any]]) -> int:
    """Sync employees in batch using UNWIND."""
    if not employees_data:
        return 0
    query = """
    UNWIND $batch AS row
    MERGE (e:Employee {id: row.id})
    SET e.name = row.name,
        e.department = row.department,
        e.employee_code = row.employee_code,
        e.job_title = row.job_title,
        e.is_active = row.is_active,
        e.weekly_capacity_hours = row.weekly_capacity_hours
    """
    tx.run(query, batch=employees_data)
    return len(employees_data)


def sync_projects_tx(tx, projects_data: List[Dict[str, Any]]) -> int:
    """Sync projects in batch using UNWIND."""
    if not projects_data:
        return 0
    query = """
    UNWIND $batch AS row
    MERGE (p:Project {id: row.id})
    SET p.name = row.name,
        p.department = row.department,
        p.status = row.status,
        p.priority = row.priority,
        p.required_team_size = row.required_team_size,
        p.start_date = row.start_date,
        p.end_date = row.end_date
    """
    tx.run(query, batch=projects_data)
    return len(projects_data)


def sync_certifications_tx(tx, certs_data: List[Dict[str, Any]]) -> int:
    """Sync certifications in batch with stable PostgreSQL Certification.id."""
    if not certs_data:
        return 0
    query = """
    UNWIND $batch AS row
    MERGE (c:Certification {id: row.id})
    SET c.name = row.name,
        c.issuer = row.issuer
    """
    tx.run(query, batch=certs_data)
    return len(certs_data)


def sync_employee_skills_tx(tx, emp_skills_data: List[Dict[str, Any]]) -> int:
    """Sync (Employee)-[:HAS_SKILL]->(Skill) relationships in batch."""
    if not emp_skills_data:
        return 0
    query = """
    UNWIND $batch AS row
    MATCH (e:Employee {id: row.employee_id})
    MATCH (s:Skill {id: row.skill_id})
    MERGE (e)-[r:HAS_SKILL]->(s)
    SET r.proficiency = row.proficiency,
        r.years_of_experience = row.years_of_experience,
        r.source = row.source
    """
    tx.run(query, batch=emp_skills_data)
    return len(emp_skills_data)


def sync_project_skills_tx(tx, proj_skills_data: List[Dict[str, Any]]) -> int:
    """Sync (Project)-[:REQUIRES_SKILL]->(Skill) relationships in batch."""
    if not proj_skills_data:
        return 0
    query = """
    UNWIND $batch AS row
    MATCH (p:Project {id: row.project_id})
    MATCH (s:Skill {id: row.skill_id})
    MERGE (p)-[r:REQUIRES_SKILL]->(s)
    SET r.required_proficiency = row.required_proficiency,
        r.importance = row.importance
    """
    tx.run(query, batch=proj_skills_data)
    return len(proj_skills_data)


def sync_employee_projects_tx(tx, emp_projects_data: List[Dict[str, Any]]) -> int:
    """Sync (Employee)-[:WORKED_ON]->(Project) relationships in batch."""
    if not emp_projects_data:
        return 0
    query = """
    UNWIND $batch AS row
    MATCH (e:Employee {id: row.employee_id})
    MATCH (p:Project {id: row.project_id})
    MERGE (e)-[r:WORKED_ON]->(p)
    SET r.role = row.role,
        r.status = row.status,
        r.allocation_percentage = row.allocation_percentage,
        r.start_date = row.start_date,
        r.end_date = row.end_date
    """
    tx.run(query, batch=emp_projects_data)
    return len(emp_projects_data)


def sync_employee_certifications_tx(tx, certs_data: List[Dict[str, Any]]) -> int:
    """Sync (Employee)-[:HAS_CERTIFICATION]->(Certification) relationships in batch using stable Certification.id."""
    if not certs_data:
        return 0
    query = """
    UNWIND $batch AS row
    MATCH (e:Employee {id: row.employee_id})
    MATCH (c:Certification {id: row.id})
    MERGE (e)-[r:HAS_CERTIFICATION]->(c)
    """
    tx.run(query, batch=certs_data)
    return len(certs_data)


def sync_skill_relations_tx(tx, relations_data: List[Dict[str, Any]]) -> Dict[str, int]:
    """Sync curated (Skill)-[:RELATED_TO]->(Skill) relationships, stored
    from the lower to the higher skill id, then delete RELATED_TO edges
    that no longer exist in PostgreSQL. Unlike other relationships these
    are pruned: a relation removed from the curated list must stop
    producing suggestions."""
    if relations_data:
        tx.run(
            """
            UNWIND $batch AS row
            MATCH (a:Skill {id: row.skill_id})
            MATCH (b:Skill {id: row.related_skill_id})
            MERGE (a)-[r:RELATED_TO]->(b)
            SET r.type = row.relation_type,
                r.source = row.source
            """,
            batch=relations_data,
        )
    keys = [f"{row['skill_id']}:{row['related_skill_id']}" for row in relations_data]
    pruned = tx.run(
        """
        MATCH (a:Skill)-[r:RELATED_TO]->(b:Skill)
        WHERE NOT (toString(a.id) + ':' + toString(b.id)) IN $keys
        DELETE r
        RETURN count(r) AS pruned
        """,
        keys=keys,
    ).single()["pruned"]
    return {"synced": len(relations_data), "pruned": pruned}


# Neo4j is a mirror of PostgreSQL, so anything no longer in PostgreSQL is
# removed. Without this, a deleted skill, requirement or assignment would
# keep showing up in graph-based skill gap results.
_PRUNABLE_NODES = ("Employee", "Skill", "Project", "Certification")
_PRUNABLE_RELATIONSHIPS = (
    # (relationship, start label, end label, pg_data key, start id field, end id field)
    ("HAS_SKILL", "Employee", "Skill", "employee_skills", "employee_id", "skill_id"),
    ("REQUIRES_SKILL", "Project", "Skill", "project_skills", "project_id", "skill_id"),
    ("WORKED_ON", "Employee", "Project", "employee_projects", "employee_id", "project_id"),
    ("HAS_CERTIFICATION", "Employee", "Certification", "certifications", "employee_id", "id"),
)
_NODE_SOURCES = {"Employee": "employees", "Skill": "skills", "Project": "projects", "Certification": "certifications"}


def prune_stale_tx(tx, pg_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, int]:
    """Delete nodes and relationships that no longer exist in PostgreSQL.
    Labels and relationship types come from the fixed lists above, never
    from input."""
    pruned = {}
    for label in _PRUNABLE_NODES:
        ids = [row["id"] for row in pg_data[_NODE_SOURCES[label]]]
        pruned[label] = tx.run(
            f"MATCH (n:{label}) WHERE NOT n.id IN $ids DETACH DELETE n RETURN count(n) AS pruned",
            ids=ids,
        ).single()["pruned"]
    for rel, start, end, source, start_field, end_field in _PRUNABLE_RELATIONSHIPS:
        keys = [f"{row[start_field]}:{row[end_field]}" for row in pg_data[source]]
        pruned[rel] = tx.run(
            f"""
            MATCH (a:{start})-[r:{rel}]->(b:{end})
            WHERE NOT (toString(a.id) + ':' + toString(b.id)) IN $keys
            DELETE r
            RETURN count(r) AS pruned
            """,
            keys=keys,
        ).single()["pruned"]
    return pruned


def record_sync_time_tx(tx) -> str:
    """Stamp the graph with when it last matched PostgreSQL, so pages built
    on it can show how fresh their data is."""
    synced_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tx.run("MERGE (m:SyncMeta {id: 'talentiq'}) SET m.synced_at = $synced_at", synced_at=synced_at)
    return synced_at


def _iso(value: Optional[date]) -> Optional[str]:
    return value.isoformat() if value else None


# -------------------------------------------------------------------------
# PostgreSQL Readers (Pure Read-Only Queries)
# -------------------------------------------------------------------------

def load_postgres_records(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """Read all relevant entities and relationships from PostgreSQL.
    Strictly read-only; does not mutate PostgreSQL.
    """
    # 1. Skills
    skills = [
        {"id": s.id, "name": s.name, "category": s.category or "General"}
        for s in db.query(Skill).all()
    ]

    # 2. Employees
    employees = [
        {
            "id": emp.id,
            "name": emp.user.full_name if emp.user else f"Employee {emp.id}",
            "department": emp.department or "Unassigned",
            "employee_code": emp.employee_code or f"EMP-{emp.id}",
            "job_title": emp.job_title or "Not set",
            "is_active": emp.is_active,
            # None when there's no availability record: capacity unknown.
            "weekly_capacity_hours": emp.availability.weekly_capacity_hours if emp.availability else None,
        }
        for emp in db.query(Employee).options(joinedload(Employee.user), joinedload(Employee.availability)).all()
    ]

    # 3. Projects
    projects = [
        {
            "id": p.id,
            "name": p.name,
            "department": p.department or "General",
            "status": p.status or "PLANNING",
            "priority": p.priority or "MEDIUM",
            "required_team_size": p.required_team_size,
            "start_date": _iso(p.start_date),
            "end_date": _iso(p.end_date),
        }
        for p in db.query(Project).all()
    ]

    # 4. Certifications
    certifications = [
        {
            "id": c.id,
            "employee_id": c.employee_id,
            "name": c.name,
            "issuer": c.issuer,
        }
        for c in db.query(Certification).all()
    ]

    # 5. Employee Skills
    employee_skills = [
        {
            "employee_id": es.employee_id,
            "skill_id": es.skill_id,
            "proficiency": es.proficiency_level,
            "years_of_experience": es.years_of_experience,
            "source": es.source,
        }
        for es in db.query(EmployeeSkill).all()
    ]

    # 6. Project Skills
    project_skills = [
        {
            "project_id": ps.project_id,
            "skill_id": ps.skill_id,
            "required_proficiency": ps.required_proficiency,
            "importance": ps.importance,
        }
        for ps in db.query(ProjectSkill).all()
    ]

    # 7. Employee Projects
    employee_projects = [
        {
            "employee_id": ep.employee_id,
            "project_id": ep.project_id,
            "role": ep.role_on_project,
            "status": ep.status,
            "allocation_percentage": ep.allocation_percentage,
            "start_date": _iso(ep.start_date),
            "end_date": _iso(ep.end_date),
        }
        for ep in db.query(EmployeeProject).all()
    ]

    # 8. Curated skill relations
    skill_relations = [
        {
            "skill_id": rel.skill_id,
            "related_skill_id": rel.related_skill_id,
            "relation_type": rel.relation_type,
            "source": rel.source,
        }
        for rel in db.query(SkillRelation).all()
    ]

    return {
        "skills": skills,
        "employees": employees,
        "projects": projects,
        "certifications": certifications,
        "employee_skills": employee_skills,
        "project_skills": project_skills,
        "employee_projects": employee_projects,
        "skill_relations": skill_relations,
    }


# -------------------------------------------------------------------------
# Synchronization Orchestrator
# -------------------------------------------------------------------------

def sync_all(db: Session, apply_constraints: bool = True) -> Dict[str, Any]:
    """Orchestrate complete idempotent PostgreSQL to Neo4j synchronization.

    Guarantees:
    - Atomicity: All graph modifications occur inside a single Managed Write Transaction (`execute_write`).
      If any failure occurs, the entire transaction is rolled back by the Neo4j driver.
    - PostgreSQL is read-only.
    """
    if not graph_service.is_enabled():
        return {
            "status": "error",
            "message": "Neo4j is not connected or enabled. Please check configuration.",
        }

    driver = graph_service._driver
    database = graph_service._database

    stats = {
        "skills_synced": 0,
        "employees_synced": 0,
        "projects_synced": 0,
        "certifications_synced": 0,
        "employee_skills_synced": 0,
        "project_skills_synced": 0,
        "employee_projects_synced": 0,
        "employee_certifications_synced": 0,
        "skill_relations_synced": 0,
        "skill_relations_pruned": 0,
    }

    try:
        # Step 1: Ensure constraints before transaction
        if apply_constraints:
            ensure_constraints()

        # Step 2: Read data from PostgreSQL (pure read-only)
        pg_data = load_postgres_records(db)

        # Step 3: Write to Neo4j within an explicit managed write transaction
        def _write_transaction(tx):
            # A. Sync Nodes
            stats["skills_synced"] = sync_skills_tx(tx, pg_data["skills"])
            stats["employees_synced"] = sync_employees_tx(tx, pg_data["employees"])
            stats["projects_synced"] = sync_projects_tx(tx, pg_data["projects"])
            stats["certifications_synced"] = sync_certifications_tx(tx, pg_data["certifications"])

            # B. Sync Relationships
            stats["employee_skills_synced"] = sync_employee_skills_tx(tx, pg_data["employee_skills"])
            stats["project_skills_synced"] = sync_project_skills_tx(tx, pg_data["project_skills"])
            stats["employee_projects_synced"] = sync_employee_projects_tx(tx, pg_data["employee_projects"])
            stats["employee_certifications_synced"] = sync_employee_certifications_tx(tx, pg_data["certifications"])
            relation_stats = sync_skill_relations_tx(tx, pg_data["skill_relations"])
            stats["skill_relations_synced"] = relation_stats["synced"]
            stats["skill_relations_pruned"] = relation_stats["pruned"]
            stats["stale_pruned"] = prune_stale_tx(tx, pg_data)
            stats["synced_at"] = record_sync_time_tx(tx)

        with driver.session(database=database) as session:
            session.execute_write(_write_transaction)

        logger.info("Successfully completed Neo4j graph synchronization: %s", stats)
        return {
            "status": "success",
            "message": "Graph synchronization completed successfully.",
            "details": stats,
        }

    except Exception as exc:
        logger.error("Error during Neo4j synchronization: %s", exc, exc_info=True)
        return {
            "status": "error",
            "message": f"Graph synchronization failed: {str(exc)}",
            "details": stats,
        }
