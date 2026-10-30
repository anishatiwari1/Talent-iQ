"""CLI script to synchronize PostgreSQL records to Neo4j.

Usage (from backend/ directory):
    python -m scripts.sync_neo4j

This script is purely on-demand and manual. It will NOT run automatically.
"""
import logging
import sys
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from app.database.postgres import SessionLocal
from app.services import graph_service
from app.services import graph_sync_service


def main():
    print("=" * 60)
    print("TalentIQ: PostgreSQL -> Neo4j Graph Synchronization")
    print("=" * 60)

    # 1. Initialize Neo4j driver
    graph_service.init_driver()
    status = graph_service.check_connectivity()
    print(f"Connectivity status: {status}")

    if not status.get("ok"):
        print("Aborting: Neo4j connection not available.")
        graph_service.close_driver()
        sys.exit(1)

    # 2. Run sync
    db = SessionLocal()
    has_error = False
    try:
        print("Starting synchronization...")
        result = graph_sync_service.sync_all(db=db, apply_constraints=True)
        print("\nSync Result:")
        print(result)

        if result.get("status") == "error":
            has_error = True
    except Exception as exc:
        print(f"\nUnexpected synchronization exception: {exc}")
        has_error = True
    finally:
        db.close()
        graph_service.close_driver()

    if has_error:
        sys.exit(1)


if __name__ == "__main__":
    main()
