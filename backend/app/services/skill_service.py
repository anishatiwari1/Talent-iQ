"""Skill catalog + normalization (Phase 5).

Normalization is implemented as an in-process alias table rather than
a new DB table for now -- it maps common raw variants onto a single
canonical Skill row already stored in `skills`. If the alias map grows
large enough to need admin editing, promote this to a `skill_aliases`
table with a migration; the lookup function's signature won't change,
so callers won't need to be touched.
"""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.skill import Skill

# canonical_name (must match a Skill.name exactly) -> raw variants seen
# in resumes/free text that should resolve to it.
SKILL_ALIASES: dict[str, list[str]] = {
    "PostgreSQL": ["postgres", "postgre sql", "psql"],
    "React": ["reactjs", "react.js"],
    "FastAPI": ["fast api"],
    "Machine Learning": ["ml"],
    "JavaScript": ["js", "javascript es6"],
    "Python": ["python3", "py"],
    "Node.js": ["nodejs", "node"],
    "Docker": ["dockerized", "containerization"],
    "Kubernetes": ["k8s"],
    "Amazon Web Services": ["aws"],
    "Artificial Intelligence": ["ai"],
    "REST API": ["restful api", "rest apis", "restful apis"],
    "TypeScript": ["ts"],
    "Structured Query Language": ["sql"],
}

_ALIAS_LOOKUP: dict[str, str] = {}
for canonical, variants in SKILL_ALIASES.items():
    _ALIAS_LOOKUP[canonical.lower()] = canonical
    for v in variants:
        _ALIAS_LOOKUP[v.lower()] = canonical


def normalize_skill_name(raw_name: str) -> str:
    """Maps a raw skill string to its canonical form. Falls back to a
    light cleanup (trim + title-case) of the original string when no
    alias is known -- deliberately conservative, never merges unrelated
    terms."""
    cleaned = raw_name.strip()
    key = cleaned.lower()
    if key in _ALIAS_LOOKUP:
        return _ALIAS_LOOKUP[key]
    return cleaned


def get_or_create_skill(db: Session, raw_name: str, category: str = "General") -> Skill:
    canonical = normalize_skill_name(raw_name)
    existing = db.scalar(
        select(Skill).where(func.lower(Skill.name) == canonical.lower())
    )
    if existing:
        return existing

    skill = Skill(name=canonical, category=category)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


def list_skills(db: Session, category: Optional[str] = None) -> list[Skill]:
    stmt = select(Skill).order_by(Skill.category, Skill.name)
    if category:
        stmt = stmt.where(Skill.category == category)
    return db.scalars(stmt).all()


def create_skill(db: Session, name: str, category: str, description: Optional[str] = None) -> Skill:
    canonical = normalize_skill_name(name)
    existing = db.scalar(select(Skill).where(func.lower(Skill.name) == canonical.lower()))
    if existing:
        raise ValueError(f"Skill '{canonical}' already exists")
    skill = Skill(name=canonical, category=category, description=description)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill
