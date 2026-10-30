import json
from pathlib import Path
import socket
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.employee_skill import EmployeeSkill
from app.models.skill import Skill
from app.schemas.llm_extraction import (
    CertificationClaim,
    ExperienceClaim,
    ExpertiseClaim,
    LLMExtraction,
    ResumeProjectClaim,
    SkillClaim,
)
from app.services import employee_service, llm_extraction_service


RESUME = (
    "I have 2 years of experience using React and TypeScript as a frontend developer. "
    "My expertise is frontend development. At Acme, I built a customer portal with React "
    "and TypeScript and improved its accessibility. I hold the AWS Cloud Practitioner "
    "certification, issued by Amazon."
)
DURATION_EVIDENCE = "I have 2 years of experience using React and TypeScript as a frontend developer."
PROJECT_EVIDENCE = "At Acme, I built a customer portal with React and TypeScript and improved its accessibility."
CERT_EVIDENCE = "I hold the AWS Cloud Practitioner certification, issued by Amazon."


class FakeRows:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return self.rows


class SkillCatalogSession:
    def __init__(self, skills):
        self.skills = skills

    def scalars(self, _statement):
        return FakeRows(self.skills)


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def accepted_resume_output():
    return LLMExtraction(
        skills=[
            SkillClaim(name="React", years_of_experience=2, evidence=DURATION_EVIDENCE),
            SkillClaim(name="TypeScript", years_of_experience=2, evidence=DURATION_EVIDENCE),
        ],
        experience=[
            ExperienceClaim(technology="React", years=2, evidence=DURATION_EVIDENCE),
            ExperienceClaim(technology="TypeScript", years=2, evidence=DURATION_EVIDENCE),
        ],
        expertise_areas=[
            ExpertiseClaim(name="Frontend Development", evidence="My expertise is frontend development.")
        ],
        certifications=[
            CertificationClaim(name="AWS Cloud Practitioner", issuer="Amazon", evidence=CERT_EVIDENCE)
        ],
        projects=[
            ResumeProjectClaim(
                name="Customer Portal",
                description="I built a customer portal with React and TypeScript and improved its accessibility.",
                technologies=["React", "TypeScript"],
                evidence=PROJECT_EVIDENCE,
            )
        ],
    )


class LLMExtractionTests(unittest.TestCase):
    def setUp(self):
        self.catalog = SkillCatalogSession([
            Skill(id=1, name="React", category="Frontend"),
            Skill(id=2, name="TypeScript", category="Programming Language"),
        ])

    def test_valid_acceptance_output_passes_evidence_validation(self):
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, accepted_resume_output(), RESUME
        )
        self.assertEqual(rejected, [])
        self.assertEqual([skill.name for skill in validated.skills], ["React", "TypeScript"])
        self.assertEqual([item.years for item in validated.experience], [2, 2])
        self.assertEqual(validated.expertise_areas[0].name, "Frontend Development")
        self.assertEqual(validated.certifications[0].issuer, "Amazon")
        self.assertEqual(validated.projects[0].name, "Customer Portal")

    def test_missing_model_fields_are_completed_from_exact_resume_evidence(self):
        extraction = LLMExtraction(
            skills=[
                SkillClaim(name="React", evidence=DURATION_EVIDENCE),
                SkillClaim(name="TypeScript", evidence=DURATION_EVIDENCE),
            ],
            experience=[
                ExperienceClaim(technology="React", evidence=PROJECT_EVIDENCE),
                ExperienceClaim(technology="TypeScript", evidence=PROJECT_EVIDENCE),
            ],
            expertise_areas=[ExpertiseClaim(
                name="Frontend Development", evidence="My expertise is frontend development."
            )],
            certifications=[CertificationClaim(
                name="AWS Cloud Practitioner", evidence=CERT_EVIDENCE
            )],
            projects=[ResumeProjectClaim(
                name="Customer Portal",
                evidence=PROJECT_EVIDENCE,
            )],
        )
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(rejected, [])
        self.assertEqual([skill.years_of_experience for skill in validated.skills], [2, 2])
        self.assertEqual([item.years for item in validated.experience], [2, 2])
        self.assertIn("2 years", validated.experience[0].evidence)
        self.assertEqual(validated.certifications[0].issuer, "Amazon")
        self.assertEqual(validated.projects[0].technologies, ["React", "TypeScript"])
        self.assertEqual(validated.projects[0].description, PROJECT_EVIDENCE)

    def test_missing_schema_fields_default_to_empty_lists(self):
        result = LLMExtraction.model_validate({})
        self.assertEqual(result.skills, [])
        self.assertEqual(result.experience, [])
        self.assertEqual(result.expertise_areas, [])
        self.assertEqual(result.certifications, [])
        self.assertEqual(result.projects, [])

    def test_schema_rejects_unexpected_fields(self):
        with self.assertRaises(ValueError):
            LLMExtraction.model_validate({"skills": [], "invented_field": "value"})

    def test_hallucinated_skill_is_rejected(self):
        extraction = LLMExtraction(skills=[
            SkillClaim(name="Python", evidence="I am an engineer.")
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(validated.skills, [])
        self.assertEqual(rejected[0].reason, "evidence_not_in_resume")

    def test_unsupported_certification_issuer_is_rejected(self):
        extraction = LLMExtraction(certifications=[
            CertificationClaim(
                name="AWS Cloud Practitioner",
                issuer="Other Company",
                evidence=CERT_EVIDENCE,
            )
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(validated.certifications, [])
        self.assertEqual(rejected[0].reason, "issuer_not_supported_by_evidence")

    def test_incorrect_experience_evidence_is_rejected(self):
        extraction = LLMExtraction(experience=[
            ExperienceClaim(technology="React", years=5, evidence=PROJECT_EVIDENCE)
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(validated.experience, [])
        self.assertEqual(rejected[0].reason, "years_not_supported_by_evidence")

    def test_missing_model_years_are_filled_only_from_explicit_resume_evidence(self):
        extraction = LLMExtraction(skills=[
            SkillClaim(name="React", years_of_experience=None, evidence=PROJECT_EVIDENCE)
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(rejected, [])
        self.assertEqual(validated.skills[0].years_of_experience, 2)
        self.assertIn("2 years", validated.skills[0].evidence)

    def test_proficiency_without_explicit_evidence_is_removed(self):
        extraction = LLMExtraction(skills=[
            SkillClaim(name="React", proficiency=4, evidence=DURATION_EVIDENCE)
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertIsNone(validated.skills[0].proficiency)
        self.assertEqual(rejected[0].category, "skill_proficiency")

    def test_expertise_and_resume_project_are_extracted_without_project_keyword(self):
        extraction = LLMExtraction(
            expertise_areas=[ExpertiseClaim(
                name="Frontend Development", evidence="My expertise is frontend development."
            )],
            projects=[ResumeProjectClaim(
                name="Customer Portal",
                description="I built a customer portal with React and TypeScript and improved its accessibility.",
                technologies=["React", "TypeScript"],
                evidence=PROJECT_EVIDENCE,
            )],
        )
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(rejected, [])
        self.assertEqual(validated.expertise_areas[0].name, "Frontend Development")
        self.assertEqual(validated.projects[0].technologies, ["React", "TypeScript"])

    def test_aliases_are_canonicalized_and_deduplicated(self):
        extraction = LLMExtraction(skills=[
            SkillClaim(name="React", evidence=PROJECT_EVIDENCE),
            SkillClaim(name="React.js", years_of_experience=2, evidence=DURATION_EVIDENCE),
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(rejected, [])
        self.assertEqual(len(validated.skills), 1)
        self.assertEqual(validated.skills[0].name, "React")

    def test_invalid_model_json_is_rejected(self):
        with patch.object(
            llm_extraction_service,
            "urlopen",
            return_value=FakeResponse({"response": "not-json"}),
        ):
            with self.assertRaises(llm_extraction_service.OllamaResponseError):
                llm_extraction_service._call_ollama("test")

    def test_ollama_unavailable_has_explicit_status(self):
        with patch.object(
            llm_extraction_service,
            "_call_ollama",
            side_effect=llm_extraction_service.OllamaUnavailableError("offline"),
        ):
            result = llm_extraction_service.extract_and_validate(self.catalog, RESUME)
        self.assertEqual(result.status, "LLM_UNAVAILABLE")
        self.assertIsNone(result.extraction)

    def test_ollama_timeout_has_failed_status(self):
        with patch.object(
            llm_extraction_service,
            "_call_ollama",
            side_effect=llm_extraction_service.OllamaTimeoutError("Ollama request timed out"),
        ):
            result = llm_extraction_service.extract_and_validate(self.catalog, RESUME)
        self.assertEqual(result.status, "LLM_FAILED")
        self.assertEqual(result.error_message, "Ollama request timed out")

    def test_long_resume_is_chunked_without_truncating_text(self):
        long_resume = "\n\n".join(f"Section {index}. React work evidence." for index in range(30))
        chunks = llm_extraction_service.chunk_resume_text(long_resume, max_chars=150)
        self.assertGreater(len(chunks), 1)
        self.assertEqual(" ".join(chunks).replace("\n", " ").split(), long_resume.replace("\n", " ").split())

    def test_long_resume_calls_each_chunk_and_merges_duplicate_claims(self):
        long_resume = "\n\n".join(f"Section {index}. {DURATION_EVIDENCE}" for index in range(100))
        output = LLMExtraction(skills=[
            SkillClaim(name="React", years_of_experience=2, evidence=DURATION_EVIDENCE)
        ])
        with patch.object(llm_extraction_service, "_call_ollama", return_value=output) as call:
            result = llm_extraction_service.extract_and_validate(self.catalog, long_resume)
        self.assertGreater(call.call_count, 1)
        self.assertEqual(result.status, "LLM_SUCCESS")
        self.assertEqual(len(result.extraction.skills), 1)

    def test_manual_employee_skill_is_not_overwritten_by_extraction(self):
        existing = SimpleNamespace(
            proficiency_level=5,
            years_of_experience=8,
            source="MANUAL",
            confidence=None,
        )
        db = SimpleNamespace(
            scalar=lambda _statement: existing,
            commit=lambda: None,
            refresh=lambda _row: None,
        )
        employee = SimpleNamespace(id=42)
        updated = employee_service.add_or_update_skill(
            db,
            employee,
            skill_id=1,
            proficiency_level=None,
            years_of_experience=2,
            source="LLM_EXTRACTION",
        )
        self.assertIs(updated, existing)
        self.assertEqual((existing.proficiency_level, existing.years_of_experience), (5, 8))
        self.assertEqual(existing.source, "MANUAL")

    def test_llm_skill_is_not_downgraded_by_existing_nlp_baseline(self):
        existing = SimpleNamespace(
            proficiency_level=4,
            years_of_experience=2,
            source="LLM_EXTRACTION",
            confidence=None,
        )
        db = SimpleNamespace(
            scalar=lambda _statement: existing,
            commit=lambda: None,
            refresh=lambda _row: None,
        )
        updated = employee_service.add_or_update_skill(
            db,
            SimpleNamespace(id=42),
            skill_id=1,
            proficiency_level=1,
            years_of_experience=0,
            source="RESUME_EXTRACTION",
            confidence=0.95,
        )
        self.assertIs(updated, existing)
        self.assertEqual((existing.proficiency_level, existing.years_of_experience), (4, 2))
        self.assertEqual(existing.source, "LLM_EXTRACTION")

    def test_missing_experience_is_rejected(self):
        # Missing experience: experience claimed but not supported by resume
        extraction = LLMExtraction(experience=[
            ExperienceClaim(technology="Java", years=2, evidence=DURATION_EVIDENCE)
        ])
        validated, rejected = llm_extraction_service._validate_extraction(
            self.catalog, extraction, RESUME
        )
        self.assertEqual(validated.experience, [])
        self.assertTrue(len(rejected) > 0)
        self.assertIn("technology_not_in_existing_skill_catalog", rejected[0].reason)

    def test_persist_llm_extraction_reprocessing(self):
        # Simulating reprocessing the same document.
        # persist_llm_extraction uses the DB session to find existing expertise and projects.
        extraction = accepted_resume_output()
        employee = SimpleNamespace(id=1)
        
        # Mocks to simulate that the records already exist.
        class FakeRecord:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)
        
        existing_expertise = FakeRecord(employee_id=1, document_id=42, name="Frontend Development", evidence="old evidence")
        existing_project = FakeRecord(employee_id=1, document_id=42, name="Customer Portal", description="old", technologies=[], evidence="old evidence")
        existing_skill = FakeRecord(id=1, name="React")
        existing_emp_skill = FakeRecord(employee_id=1, skill_id=1, source="LLM_EXTRACTION")
        
        def fake_scalar(stmt):
            stmt_str = str(stmt).lower()
            if "employee_expertise" in stmt_str:
                return existing_expertise
            if "resume_projects" in stmt_str:
                return existing_project
            if "skills" in stmt_str and "react" in stmt_str:
                return existing_skill
            if "employee_skills" in stmt_str:
                return existing_emp_skill
            return None

        added_records = []
        db = SimpleNamespace(
            scalar=fake_scalar,
            add=lambda r: added_records.append(r),
            commit=lambda: None,
            refresh=lambda r: None,
        )
        
        summary = employee_service.persist_llm_extraction(db, employee, 42, extraction)
        
        # No new expertise or project should be added, they should be updated in place
        self.assertEqual(len(added_records), 1) # only certification added because we didn't mock existing certification
        self.assertEqual(existing_expertise.evidence, "My expertise is frontend development.")
        self.assertEqual(existing_project.description, "I built a customer portal with React and TypeScript and improved its accessibility.")
        self.assertEqual(existing_project.technologies, ["React", "TypeScript"])



if __name__ == "__main__":
    unittest.main()