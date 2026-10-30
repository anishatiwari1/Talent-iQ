from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.llm_extraction import LLMExtraction, PersistedExtractionSummary, RejectedClaim


class DocumentOut(BaseModel):
    id: int
    document_type: str
    file_name: str
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    processing_status: str
    extraction_status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class ExtractionResultOut(BaseModel):
    document_id: int
    skills_extracted: list[str]
    skills_added_count: int
    experience_keywords: list[str]
    confidence_avg: float
    llm_status: str = "NOT_RUN"
    llm_extracted: Optional[LLMExtraction] = None
    llm_persisted: PersistedExtractionSummary = Field(default_factory=PersistedExtractionSummary)
    llm_rejected: list[RejectedClaim] = Field(default_factory=list)
    llm_error: Optional[str] = None
    llm_extraction_id: Optional[int] = None
    llm_chunks_processed: int = 0
