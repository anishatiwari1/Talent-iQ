import os
from pathlib import Path
import sys
import pytest
from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Force test database URL BEFORE any app imports
TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://postgres:postgres@localhost:5432/talentiq_test_db"
)
os.environ["DATABASE_URL"] = TEST_DB_URL

# Import all models to ensure metadata is complete
from app.database.base import Base
import app.models.user
import app.models.employee
import app.models.project
import app.models.team
import app.models.employee_project
import app.models.assignment
import app.models.availability
import app.models.notification
import app.models.skill_gap
import app.models.skill
import app.models.resume_project
import app.models.recommendation
import app.models.project_skill
import app.models.employee_skill
import app.models.employee_expertise
import app.models.document_extraction
import app.models.document
import app.models.certification

from app.database.postgres import SessionLocal, engine, get_db
from app.main import app
from fastapi.testclient import TestClient

# Ensure schema exists on test database
Base.metadata.create_all(engine)


@pytest.fixture(scope="function", autouse=True)
def clean_test_db():
    """Clean all tables in talentiq_test_db after each test."""
    yield
    with engine.connect() as conn:
        with conn.execution_options(isolation_level="AUTOCOMMIT"):
            # Truncate all tables in reverse topological order
            table_names = [f'"{table.name}"' for table in Base.metadata.sorted_tables]
            if table_names:
                conn.execute(text(f"TRUNCATE TABLE {', '.join(table_names)} CASCADE;"))


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
