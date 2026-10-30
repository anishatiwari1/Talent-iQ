"""Orchestrates the full Phase 4 flow:

Document -> text extraction -> NLP skill/experience extraction ->
skill normalization -> EmployeeSkill upsert -> Document status update

Kept as its own module (rather than folded into document_service or
nlp_service) so routes have one obvious entry point, per the "clean
service layer, not scattered logic" instruction.
"""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_extraction import DocumentExtraction
from app.models.employee import Employee
from app.services import document_service, employee_service, nlp_service
from app.services import llm_extraction_service
from app.services.skill_service import get_or_create_skill

logger = logging.getLogger("talentiq.extraction")


def process_document(db: Session, document: Document, employee: Employee) -> dict:
    document.processing_status = "PROCESSING"
    document.extraction_status = "IN_PROGRESS"
    db.commit()

    try:
        text = document_service.read_document_text(document)
    except Exception as exc:
        document.processing_status = "FAILED"
        document.extraction_status = "FAILED"
        db.commit()
        logger.warning("Document %s text extraction failed: %s", document.id, exc)
        raise

    extraction = nlp_service.extract(db, text)

    added_count = 0
    for skill_name, confidence in extraction.skills.items():
        skill = get_or_create_skill(db, skill_name)
        employee_service.add_or_update_skill(
            db,
            employee,
            skill_id=skill.id,
            proficiency_level=1,  # extraction can't infer proficiency -- starts at baseline
            years_of_experience=0,
            source="RESUME_EXTRACTION",
            confidence=confidence,
        )
        added_count += 1

    llm_started_at = datetime.utcnow()
    llm_outcome = llm_extraction_service.extract_and_validate(
        db,
        text,
        nlp_skill_hints=list(extraction.skills.keys()),
    )
    persisted = None
    llm_error = llm_outcome.error_message
    llm_status = llm_outcome.status
    if llm_outcome.extraction is not None:
        try:
            persisted = employee_service.persist_llm_extraction(
                db, employee, document.id, llm_outcome.extraction
            )
        except Exception as exc:
            db.rollback()
            logger.exception("LLM extraction persistence failed for document %s", document.id)
            llm_status = "LLM_FAILED"
            llm_error = f"Validated LLM extraction could not be persisted ({type(exc).__name__})"

    persisted_data = persisted.model_dump(mode="json") if persisted else {}
    validated_data = (
        llm_outcome.extraction.model_dump(mode="json")
        if llm_outcome.extraction is not None else None
    )
    rejected_claims = [claim.model_dump(mode="json") for claim in llm_outcome.rejected_claims]
    if llm_status == "LLM_FAILED" and llm_outcome.extraction is not None:
        validated_data = None
        persisted_data = {}

    extraction_run = DocumentExtraction(
        document_id=document.id,
        employee_id=employee.id,
        model_name=llm_extraction_service.LLM_MODEL,
        prompt_version=llm_extraction_service.PROMPT_VERSION,
        schema_version=llm_extraction_service.SCHEMA_VERSION,
        status=llm_status,
        validated_data=validated_data,
        rejected_claims=rejected_claims,
        persisted_data=persisted_data,
        error_message=llm_error,
        started_at=llm_started_at,
        completed_at=datetime.utcnow(),
    )
    db.add(extraction_run)

    document.processing_status = "COMPLETED"
    document.extraction_status = "COMPLETED"
    document.processed_at = datetime.utcnow()
    db.commit()

    logger.info(
        "document_processed id=%s employee_id=%s skills_extracted=%d method=%s",
        document.id, employee.id, added_count, extraction.method,
    )

    return {
        "document_id": document.id,
        "skills_extracted": list(extraction.skills.keys()),
        "skills_added_count": added_count,
        "experience_keywords": extraction.experience_keywords,
        "confidence_avg": (
            sum(extraction.skills.values()) / len(extraction.skills)
            if extraction.skills else 0.0
        ),
        "llm_status": llm_status,
        "llm_extracted": validated_data,
        "llm_persisted": persisted_data,
        "llm_rejected": rejected_claims,
        "llm_error": llm_error,
        "llm_extraction_id": extraction_run.id,
        "llm_chunks_processed": llm_outcome.chunks_processed,
    }
