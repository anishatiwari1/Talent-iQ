"""Semantic embeddings + FAISS similarity search (Phase 7).

Like graph_service, this module degrades honestly: if
sentence-transformers/faiss aren't installed, `is_enabled()` returns
False and the recommendation engine (Phase 8) falls back to a purely
skill/experience-based score with semantic_similarity reported as
None rather than a faked number -- the UI/explanation should say
"semantic similarity unavailable" in that case, not show a made-up
percentage.

Index is rebuilt in-process on demand rather than persisted to disk
for this phase -- fine at seed-data scale; swap for a persisted FAISS
index file (or a vector DB) before this needs to scale past a few
thousand employees.
"""
import logging
from typing import Optional

logger = logging.getLogger("talentiq.embeddings")

try:
    from sentence_transformers import SentenceTransformer
    import numpy as np
    import faiss
    _LIBS_AVAILABLE = True
except ImportError:
    _LIBS_AVAILABLE = False

_model = None
_MODEL_NAME = "all-MiniLM-L6-v2"
_MODEL_KWARGS = {
    "local_files_only": True,
}


def is_enabled() -> bool:
    if not _LIBS_AVAILABLE:
        return False
    try:
        _get_model()
        return True
    except Exception:
        return False


def _get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(
            _MODEL_NAME,
            **_MODEL_KWARGS,
        )
    return _model


def embed_text(text: str):
    """Returns a numpy float32 vector, or None if embeddings are
    unavailable in this environment."""
    if not _LIBS_AVAILABLE:
        return None
    model = _get_model()
    vector = model.encode([text], normalize_embeddings=True)[0]
    return vector.astype("float32")


def build_index(vectors: list, ids: list[int]):
    """Builds an in-memory FAISS index over the given vectors (cosine
    similarity via normalized inner product). Returns None if FAISS
    isn't available."""
    if not _LIBS_AVAILABLE or not vectors:
        return None
    dimension = len(vectors[0])
    index = faiss.IndexFlatIP(dimension)
    matrix = np.array(vectors, dtype="float32")
    index.add(matrix)
    return {"index": index, "ids": ids}


def search(index_bundle, query_vector, top_k: int = 10) -> list[tuple[int, float]]:
    """Returns [(id, similarity_score), ...] sorted by similarity
    descending. Empty list if embeddings are unavailable."""
    if index_bundle is None or query_vector is None:
        return []
    index = index_bundle["index"]
    ids = index_bundle["ids"]
    scores, positions = index.search(
        np.array([query_vector], dtype="float32"), min(top_k, len(ids))
    )
    results = []
    for score, pos in zip(scores[0], positions[0]):
        if pos == -1:
            continue
        results.append((ids[pos], float(score)))
    return results


def profile_text(job_title: str, department: str, skill_names: list[str], bio: Optional[str]) -> str:
    """Builds the text blob an employee profile is embedded from --
    kept as one function so the recommendation engine and any future
    re-indexing job embed profiles identically."""
    parts = [job_title, department, ", ".join(skill_names)]
    if bio:
        parts.append(bio)
    return ". ".join(p for p in parts if p)


def requirement_text(description: Optional[str], required_skill_names: list[str]) -> str:
    parts = [description or "", ", ".join(required_skill_names)]
    return ". ".join(p for p in parts if p)
