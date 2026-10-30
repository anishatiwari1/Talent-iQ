from pathlib import Path
import sys

from sqlalchemy import select
from sqlalchemy.orm import joinedload

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.postgres import SessionLocal, engine
from app.models.employee import Employee
from app.services.employee_service import recompute_allocated_hours


def main() -> None:
    engine.echo = False
    db = SessionLocal()
    try:
        employees = db.scalars(
            select(Employee)
            .options(joinedload(Employee.availability))
            .order_by(Employee.id)
        ).unique().all()

        results = []
        for employee in employees:
            old_availability = employee.availability
            old_hours = old_availability.allocated_hours if old_availability else None
            old_status = old_availability.status if old_availability else None

            new_availability = recompute_allocated_hours(db, employee)
            results.append((
                employee.id,
                old_hours,
                old_status,
                new_availability.allocated_hours,
                new_availability.status,
            ))

        print("employee_id | old allocated_hours | old status | new allocated_hours | new status")
        print("------------|---------------------|------------|---------------------|-----------")
        for employee_id, old_hours, old_status, new_hours, new_status in results:
            print(
                f"{employee_id:11} | {str(old_hours):19} | {str(old_status):10} | "
                f"{new_hours:19} | {new_status}"
            )
        print(f"Backfilled availability for {len(results)} employees.")
    finally:
        db.close()


if __name__ == "__main__":
    main()