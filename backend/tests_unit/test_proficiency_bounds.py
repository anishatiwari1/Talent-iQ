"""Proficiency inputs are limited to the 1-5 scale; stored values are
still readable whatever they are."""
import pytest
from pydantic import ValidationError

from app.schemas.employee import EmployeeSkillIn, EmployeeSkillOut
from app.schemas.project import ProjectCreate, ProjectSkillIn, ProjectSkillOut, ProjectUpdate


@pytest.mark.parametrize("level", [1, 2, 3, 4, 5])
def test_levels_on_the_scale_are_accepted(level):
    assert EmployeeSkillIn(skill_id=1, proficiency_level=level).proficiency_level == level
    assert ProjectSkillIn(skill_id=1, required_proficiency=level).required_proficiency == level


@pytest.mark.parametrize("level", [-1, 0, 6, 10])
def test_levels_off_the_scale_are_rejected(level):
    with pytest.raises(ValidationError):
        EmployeeSkillIn(skill_id=1, proficiency_level=level)
    with pytest.raises(ValidationError):
        ProjectSkillIn(skill_id=1, required_proficiency=level)


def test_defaults_are_unchanged():
    assert EmployeeSkillIn(skill_id=1).proficiency_level == 1
    assert ProjectSkillIn(skill_id=1).required_proficiency == 1


def test_nested_project_requirements_are_validated():
    with pytest.raises(ValidationError):
        ProjectCreate(name="P", department="Eng", required_skills=[{"skill_id": 1, "required_proficiency": 6}])
    with pytest.raises(ValidationError):
        ProjectUpdate(required_skills=[{"skill_id": 1, "required_proficiency": 0}])


def test_output_schemas_still_read_out_of_range_rows():
    # Rows stored before validation existed must not break reads.
    project_skill = ProjectSkillOut(id=1, skill_id=1, skill_name="Python", required_proficiency=9, importance="IMPORTANT")
    employee_skill = EmployeeSkillOut(
        id=1, skill={"id": 1, "name": "Python", "category": "Language"},
        proficiency_level=0, years_of_experience=0, source="MANUAL",
    )
    assert project_skill.required_proficiency == 9
    assert employee_skill.proficiency_level == 0
