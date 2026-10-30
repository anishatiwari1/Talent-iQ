"""Document -> structured skill/experience extraction (Phase 4).

Design: this module is honest about two extraction tiers.

1. spaCy tier (preferred): if spaCy + a model (en_core_web_sm) are
   installed, we use it for tokenization/lemmatization and noun-chunk
   extraction, which gives cleaner boundaries around multi-word skills
   ("machine learning", "rest api").
2. Fallback tier (always available): a deterministic keyword matcher
   that scans the document text for exact/near matches against the
   `skills` table (canonicalized via skill_service.normalize_skill_name)
   plus a curated experience-keyword list. No network calls, no
   guessing, no invented skills -- every extracted skill must appear
   as a substring match in the source text, so the result is always
   traceable back to the document.

Never claims a skill was found unless it is literally present in the
text (after normalization). Confidence is set by which tier matched
and how the match was found (exact skill name vs. alias).
"""
import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.skill import Skill
from app.services.skill_service import SKILL_ALIASES, normalize_skill_name

try:
    import spacy
    _NLP = None  # lazy-loaded on first use
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False


EXPERIENCE_KEYWORDS = [
    "backend development", "frontend development", "full stack development",
    "api development", "database development", "cloud infrastructure",
    "devops", "data engineering", "machine learning engineering",
    "mobile development", "system design", "microservices",
    "team leadership", "project management", "agile development",
    "testing and qa", "ci/cd",
]


@dataclass
class ExtractionResult:
    skills: dict[str, float] = field(default_factory=dict)  # canonical name -> confidence
    experience_keywords: list[str] = field(default_factory=list)
    method: str = "keyword_fallback"


def _get_spacy_model():
    global _NLP
    if _NLP is None:
        try:
            _NLP = spacy.load("en_core_web_sm")
        except OSError:
            raise RuntimeError(
                "spaCy is installed but the 'en_core_web_sm' model is not. "
                "Run: python -m spacy download en_core_web_sm"
            )
    return _NLP


def _build_skill_vocabulary(db: Session) -> dict[str, str]:
    """Maps every known lowercase skill name/alias -> canonical Skill.name."""
    vocab: dict[str, str] = {}
    for skill in db.scalars(select(Skill)).all():
        vocab[skill.name.lower()] = skill.name
    for canonical, variants in SKILL_ALIASES.items():
        vocab[canonical.lower()] = canonical
        for v in variants:
            vocab[v.lower()] = canonical
    return vocab


def extract(db: Session, text: str) -> ExtractionResult:
    result = ExtractionResult()
    text_lower = text.lower()

    vocabulary = _build_skill_vocabulary(db)

    # --- Skill matching ------------------------------------------------
    # Exact/alias substring match, always run (works with or without
    # spaCy) -- this is the traceable, explainable core of extraction.
    for raw_term, canonical in vocabulary.items():
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(raw_term) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, text_lower):
            confidence = 0.95 if raw_term == canonical.lower() else 0.85
            existing = result.skills.get(canonical, 0.0)
            result.skills[canonical] = max(existing, confidence)

    if SPACY_AVAILABLE:
        try:
            nlp = _get_spacy_model()
            doc = nlp(text)
            # Noun chunks give us multi-word candidate phrases we may
            # not have caught with plain substring matching (e.g. a
            # skill name split oddly across a line break in the raw
            # text). We only accept a chunk if, once normalized, it
            # matches a *known* skill -- we never invent new skill
            # names from arbitrary noun phrases.
            known_canonical_names = set(vocabulary.values())
            for chunk in doc.noun_chunks:
                normalized = normalize_skill_name(chunk.text)
                if normalized in known_canonical_names:
                    existing = result.skills.get(normalized, 0.0)
                    result.skills[normalized] = max(existing, 0.7)
            result.method = "spacy"
        except RuntimeError:
            # Model not downloaded -- silently keep using the fallback
            # tier rather than failing the whole extraction.
            pass

    # --- Experience keyword matching -----------------------------------
    for keyword in EXPERIENCE_KEYWORDS:
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(keyword) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, text_lower):
            result.experience_keywords.append(keyword)

    return result
