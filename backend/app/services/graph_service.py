"""Neo4j relationship-graph service layer (Phase 6).

PostgreSQL remains the source of truth for all business data; this
module only mirrors relationships into Neo4j for graph-shaped queries
(e.g. "find employees within 2 hops of a required skill via related
skills") that are awkward in SQL. Every write here is a sync operation
driven by a Postgres change -- Neo4j is never written to independently.

This module is intentionally optional at runtime: if `neo4j` isn't
installed or `NEO4J_URI` isn't configured, every function becomes a
documented no-op rather than raising, so the rest of the app keeps
working without a graph database attached. This matches the master
prompt's instruction not to fake results -- callers can check
`graph_service.is_enabled()` and skip graph-specific UI/features
honestly rather than showing fabricated graph data.

Environment variables
---------------------
- NEO4J_URI        : Bolt/neo4j URI  (e.g. neo4j://127.0.0.1:7687)
- NEO4J_USERNAME   : Auth username   (e.g. neo4j)
- NEO4J_PASSWORD   : Auth password   (read from environment; never hardcoded)
- NEO4J_DATABASE   : Target database (default: neo4j)
"""
import logging
import os
import time
from typing import Optional

logger = logging.getLogger("talentiq.graph")

try:
    from neo4j import GraphDatabase
    _DRIVER_CLASS_AVAILABLE = True
except ImportError:
    _DRIVER_CLASS_AVAILABLE = False

_driver = None
_database: Optional[str] = None
_last_attempt = 0.0
# Neo4j is often started after the API (or restarted under it), so a
# disabled service retries the connection at most this often instead of
# staying off until the API itself is restarted.
_RETRY_SECONDS = 15


def is_enabled() -> bool:
    if _driver is None and time.monotonic() - _last_attempt >= _RETRY_SECONDS:
        init_driver()
    return _driver is not None


def init_driver() -> None:
    """Call once at app startup.  Safe to call even when Neo4j isn't
    configured -- just leaves the module disabled.

    Reads connection details from environment variables:
    NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, NEO4J_DATABASE.

    If any of the first three are missing the service stays disabled.
    If a connection attempt fails the service stays disabled and the
    application continues to start normally.
    """
    global _driver, _database, _last_attempt
    _last_attempt = time.monotonic()
    if not _DRIVER_CLASS_AVAILABLE:
        logger.info("neo4j driver package not installed; graph service disabled.")
        return

    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    _database = os.getenv("NEO4J_DATABASE", "neo4j")

    if not uri or not username or not password:
        logger.info(
            "NEO4J_URI/NEO4J_USERNAME/NEO4J_PASSWORD not fully set; "
            "graph service disabled."
        )
        return

    try:
        _driver = GraphDatabase.driver(uri, auth=(username, password))
        _driver.verify_connectivity()
        logger.info("Neo4j graph service connected: %s (database=%s)", uri, _database)
    except Exception as exc:
        logger.warning(
            "Could not connect to Neo4j (%s); graph service disabled. "
            "The application will continue without graph features.",
            exc,
        )
        _driver = None


def close_driver() -> None:
    global _driver, _database
    if _driver is not None:
        _driver.close()
        _driver = None
        _database = None


def check_connectivity() -> dict:
    """Return a dict describing the current Neo4j connection status.

    This function is intended for diagnostic / health-check use.  It
    does *not* raise on failure -- the caller decides what to do with
    the result.

    Returns
    -------
    dict with keys:
        enabled  (bool)  : whether the graph service is active
        uri      (str|None) : the configured NEO4J_URI
        database (str|None) : the configured NEO4J_DATABASE
        ok       (bool)  : True only when a round-trip to the server succeeded
        detail   (str)   : human-readable status message
    """
    uri = os.getenv("NEO4J_URI")
    result: dict = {
        "enabled": is_enabled(),
        "uri": uri,
        "database": _database,
        "ok": False,
        "detail": "",
    }

    if not is_enabled():
        result["detail"] = "Graph service is not enabled."
        return result

    try:
        _driver.verify_connectivity()
        result["ok"] = True
        result["detail"] = "Neo4j connectivity verified."
    except Exception as exc:
        result["detail"] = f"Connectivity check failed: {exc}"

    return result


def _run(query: str, **params) -> None:
    if not is_enabled():
        return
    with _driver.session(database=_database) as session:
        session.run(query, **params)


def run_read(query: str, **params) -> list[dict]:
    """Run a read-only query and return each record as a dict. Callers
    must check is_enabled() first."""
    with _driver.session(database=_database) as session:
        return session.execute_read(lambda tx: [record.data() for record in tx.run(query, **params)])


def upsert_employee(employee_id: int, full_name: str, department: str, is_active: bool = True) -> None:
    _run(
        """
        MERGE (e:Employee {id: $id})
        SET e.name = $name, e.department = $department, e.is_active = $is_active
        """,
        id=employee_id, name=full_name, department=department, is_active=is_active,
    )


def upsert_skill(skill_id: int, name: str, category: str) -> None:
    _run(
        """
        MERGE (s:Skill {id: $id})
        SET s.name = $name, s.category = $category
        """,
        id=skill_id, name=name, category=category,
    )


def link_employee_skill(employee_id: int, skill_id: int, proficiency: int) -> None:
    _run(
        """
        MATCH (e:Employee {id: $employee_id}), (s:Skill {id: $skill_id})
        MERGE (e)-[r:HAS_SKILL]->(s)
        SET r.proficiency = $proficiency
        """,
        employee_id=employee_id, skill_id=skill_id, proficiency=proficiency,
    )


def upsert_project(project_id: int, name: str, department: str) -> None:
    _run(
        """
        MERGE (p:Project {id: $id})
        SET p.name = $name, p.department = $department
        """,
        id=project_id, name=name, department=department,
    )


def link_project_requires_skill(project_id: int, skill_id: int, required_proficiency: int) -> None:
    _run(
        """
        MATCH (p:Project {id: $project_id}), (s:Skill {id: $skill_id})
        MERGE (p)-[r:REQUIRES_SKILL]->(s)
        SET r.required_proficiency = $required_proficiency
        """,
        project_id=project_id, skill_id=skill_id, required_proficiency=required_proficiency,
    )


def link_employee_worked_on(employee_id: int, project_id: int, role: Optional[str]) -> None:
    _run(
        """
        MATCH (e:Employee {id: $employee_id}), (p:Project {id: $project_id})
        MERGE (e)-[r:WORKED_ON]->(p)
        SET r.role = $role
        """,
        employee_id=employee_id, project_id=project_id, role=role,
    )


def link_employee_certification(
    employee_id: int, certification_id: int, certification_name: str, issuer: str
) -> None:
    # Keyed on the PostgreSQL Certification.id, matching graph_sync_service
    # and its uniqueness constraint; name/issuer are just properties.
    _run(
        """
        MERGE (c:Certification {id: $certification_id})
        SET c.name = $name, c.issuer = $issuer
        WITH c
        MATCH (e:Employee {id: $employee_id})
        MERGE (e)-[:HAS_CERTIFICATION]->(c)
        """,
        employee_id=employee_id, certification_id=certification_id,
        name=certification_name, issuer=issuer,
    )


def find_related_employees_for_skill(skill_id: int, hops: int = 2) -> list[dict]:
    """Active employees connected to a skill within N hops via related
    skills (e.g. someone with 'FastAPI' when the project needs 'Python'
    and the two skills are RELATED_TO each other in the graph).
    RELATED_TO comes from the curated skill_relations table via
    graph_sync_service; results are suggestions, never coverage.
    Returns [] if the graph service is disabled -- callers should treat
    an empty result from a disabled graph differently from a genuinely
    empty match (check is_enabled() first)."""
    if not is_enabled():
        return []
    with _driver.session(database=_database) as session:
        result = session.run(
            f"""
            MATCH (s:Skill {{id: $skill_id}})
            MATCH (e:Employee)-[has:HAS_SKILL]->(related:Skill)
            WHERE e.is_active = true AND (s)-[:RELATED_TO*1..{hops}]-(related)
            RETURN DISTINCT e.id AS employee_id, e.name AS name,
                   related.id AS related_skill_id, related.name AS related_skill_name,
                   has.proficiency AS proficiency
            """,
            skill_id=skill_id,
        )
        return [dict(record) for record in result]
