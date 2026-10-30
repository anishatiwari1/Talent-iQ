# TalentIQ Research Evaluation Report

## 1. Dataset Description
- **Employees**: 30 evaluation profiles (across Engineering, Data & AI, DevOps, Design, Product).
- **Projects**: 15 evaluation projects with distinct skill requirements and required team sizes.
- **Resumes**: 10 distinct, highly realistic software engineering resumes with varying formats.
- **Availability Data**: 14 active assignments simulating realistic organizational workload and partial availability.

## 2. Experimental Setup
- **Extraction Model**: Local Qwen2.5 3B via Ollama + spaCy/Keyword fallback.
- **Semantic Engine**: SentenceTransformers (`all-MiniLM-L6-v2`) + FAISS for retrieval.
- **Recommendation Algorithm**: Explainable weighted scoring (Skill: 40%, Availability: 20%, Proficiency: 15%, Experience: 15%, Semantic: 10%).
- **Team Formation Algorithm**: Greedy Set Cover maximizing required skill coverage.

## 3. Extraction Results
*Evaluated against manually constructed ground truth matching exact resume text.*

| Metric | Result |
|--------|--------|
| Precision | 0.907 |
| Recall | 1.000 |
| F1-score | 0.951 |

## 4. Recommendation Results
*Evaluated using Precision, Recall, and NDCG at K=5 against 0-3 human relevance labels.*

| Method | Precision@5 | Recall@5 | NDCG@5 |
|--------|-------------|----------|--------|
| Structured Only (Ablation) | 0.880 | 0.615 | 0.826 |
| TalentIQ Production | 0.880 | 0.615 | 0.826 |

## 5. Team Formation Results
*Evaluated on the ability to fulfill project skill requirements within the required team size constraint.*

| Metric | Result |
|--------|--------|
| Average Skill Coverage | 100.0% |
| Minimum Coverage | 100.0% |
| Maximum Coverage | 100.0% |

## 6. System Performance
*Real execution times measured directly against the database and local LLM.*

| Operation | Average (s) | Min (s) | Max (s) |
|-----------|-------------|---------|---------|
| Resume Processing | 76.800 | 39.722 | 123.661 |
| Recommendation | 5.312 | 3.702 | 8.481 |
| Team Formation | 2.610 | 2.434 | 2.759 |

## 7. Limitations
- Resume processing time depends heavily on the local LLM execution speed.
- Semantic matching handles implicit similarities well but can occasionally dilute structured exact-match requirements if weighted too heavily.
- Team formation uses a greedy approach; while fast, it might not find the global optimal team in extremely complex constraint scenarios.
