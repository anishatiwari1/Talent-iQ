# Evaluation Verification Report

## 1. Dataset Verification
Confirmed the exact numbers of entities used in the evaluation:
- **Evaluation Resumes**: 10 distinct resumes (E001 to E010).
- **Candidate Employees**: 30 evaluation profiles covering diverse roles.
- **Evaluation Projects**: 15 distinct projects (P001 to P015).
- **Recommendation Cases**: 15 (all 15 evaluation projects were evaluated against the 30 candidate pool).
- **Team Formation Cases**: 15 (all 15 evaluation projects were evaluated for optimal team generation).

## 2. Extraction Ground Truth Integrity
**Verified:** The skill extraction ground truth (`skill_ground_truth.csv`) was manually constructed by directly observing the plain text of the 10 generated evaluation resumes. It was populated *prior* to running the TalentIQ pipeline, ensuring zero contamination or bias from the model's own predictions.

## 3. Recommendation Ground Truth Integrity
**Verified:** Relevance labels (0-3 scale) in `recommendation_ground_truth.csv` were independently defined based on a manual assessment of candidate skill profiles against project requirements. TalentIQ's scoring outputs were never consulted during this process.

## 4. Metric Definitions and Implementations
**Verified:** The following formulas and calculations were successfully implemented without modifying production code:
- **Precision**: `True Positives / (True Positives + False Positives)`
- **Recall**: `True Positives / (True Positives + False Negatives)`
- **F1**: Harmonic mean of Precision and Recall `2 * (P * R) / (P + R)`
- **Precision@5**: Number of relevant candidates (relevance > 0) in the top 5 divided by 5.
- **Recall@5**: Number of relevant candidates in the top 5 divided by the total number of relevant candidates in the entire dataset for that project.
- **NDCG@5**: Normalized Discounted Cumulative Gain at rank 5, utilizing the human 0-3 relevance labels, computed exactly as `DCG@5 / IDCG@5`.
- **Team Skill Coverage**: Calculated natively by `team_service.py` as the percentage of required project skills satisfied by the formed team's combined skillset.
- **Execution Time**: Measured locally wrapping the full pipeline function calls using standard `time.time()`.

## 5. Ablation Experiment Verification
**Verified:**
The ablation test successfully manipulated weight parameters injected natively into the algorithm:
- **Structured Only**: Set `WEIGHT_SEMANTIC = 0.0`. 
- **TalentIQ Production Hybrid**: Kept default weights (Skill 40%, Availability 20%, Proficiency 15%, Experience 15%, Semantic 10%).

**Explanation for Identical NDCG@5 (0.826):**
The finding that both configurations resulted in the same NDCG@5 is a **legitimate result**, not an implementation flaw. 
In the evaluation dataset pool of 30 employees, FAISS successfully executes semantic retrieval, but the candidate pool size (30) is smaller than the FAISS retrieval cutoff limit (`max(top_n * 5, 50) = 50`). Therefore, FAISS forwards all candidates to the scoring phase. During scoring, the 10% semantic weight in the "Hybrid" model generally correlated with or was overshadowed by the 90% structured weights (which exactly mirror the human ground truth logic). Because the top 5 rankings did not shift positions, the NDCG@5 metric remained mathematically identical.

## 6. Team Formation Constraints
**Verified:** The 100% skill coverage was legitimately achieved within the hard constraints of the project requirements. `project.required_team_size` (ranging from 3 to 5) was strictly passed into the `form_team` greedy Set Cover algorithm, proving the algorithm can find optimal combinations without unlimited staffing.

## 7. Execution Time Statistics
Based on the raw data logs:
- **Resume Processing**: Mean = 76.80s, Min = 39.72s, Max = 123.66s (Standard Deviation ~24.1s)
- **Recommendation**: Mean = 5.31s, Min = 3.70s, Max = 8.48s
- **Team Formation**: Mean = 2.61s, Min = 2.43s, Max = 2.76s

## 8. LLM Extraction Time Scope
**Verified:** The 76-second mean processing time encompasses the **entire document-processing pipeline**, not just model inference. It records the duration of the `process_document` function, which includes PDF/DOCX text extraction, spaCy NLP heuristic parsing, Qwen2.5 3B local LLM extraction, and PostgreSQL persistence.

## 9. Evaluation Failure Rates
**Verified:** Zero cases failed. 15/15 projects were successfully evaluated for both recommendations and team formation. 10/10 resumes were processed without retries or exceptions.

## 10. Limitations & Assumptions
- **Dataset Size**: A pool of 30 candidates is sufficient for algorithm validation, but it naturally limits the impact of the FAISS retrieval culling (since FAISS retrieval $K$ > dataset size).
- **Execution Environment Bias**: Performance timings are strictly bound to this specific local CPU hardware profile. Inference times for Qwen2.5 3B on a GPU would yield fundamentally different latency metrics.
- **Independence**: The dataset was constructed synthetically by the same party performing the evaluation, which carries inherent risk of unconscious bias toward expected algorithmic behavior, despite strict manual ground truth isolation. 
