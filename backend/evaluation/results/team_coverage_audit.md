# Team Coverage Evaluation Audit Report

## 1. Skill Distribution & Coverage Potential
An audit of the evaluation dataset (`projects.csv`, `project_requirements.csv`, `employee_skills.csv`) reveals the following availability of skills among the 30 evaluation candidates:

**Project P001 (Size: 5)**
- React (MUST_HAVE): 10 candidates have it (9 meet proficiency)
- FastAPI (MUST_HAVE): 8 candidates have it (8 meet proficiency)
- PostgreSQL (IMPORTANT): 11 candidates have it (11 meet proficiency)
- REST API (IMPORTANT): 7 candidates have it (7 meet proficiency)
- TypeScript (NICE_TO_HAVE): 4 candidates have it (4 meet proficiency)

*(Similar robust availability exists across all 15 projects. Every single required skill across all projects is possessed by at least 2 candidates in the dataset).*

## 2. Dataset Capabilities
- **Projects where 100% coverage was theoretically possible:** 15 (100%)
- **Projects where 100% coverage was impossible:** 0 (0%)
- **Projects where some required skills had zero qualified employees:** 0 (0%)

**Verification:** The evaluation dataset implicitly guarantees that every project can achieve 100% coverage. Because team sizes (3-5) are roughly equal to the number of required skills (3-5), and every skill is well-represented in the candidate pool, the greedy algorithm easily finds enough candidates to cover every requirement before hitting the team-size limit.

## 3. Team Skill Coverage Formula Verification
The metric calculation natively implemented in `team_service.py` is mathematically valid regarding importance weights. It correctly uses:
```python
sum(IMPORTANCE_WEIGHT.get(required_skill.importance) for covered_skills) / total_weight_of_all_required_skills * 100
```
This correctly ensures `MUST_HAVE` (weight 3) impacts the percentage more than `NICE_TO_HAVE` (weight 1). 

## 4. Proficiency Enforcement Check (Critical Finding)
**Verification:** Required proficiency is **NOT** considered when determining if a skill is covered. 

In `team_service.py`, the coverage condition is strictly a boolean intersection of skill IDs:
```python
newly_covered = (employee_skill_ids & required_skill_ids.keys()) - covered_skill_ids
```
If a project requires `React` at proficiency `5` (Advanced), and a candidate has `React` at proficiency `1` (Beginner), the algorithm marks `React` as 100% successfully covered. This significantly inflates the coverage metric, making it much easier to hit 100%.

## 5. Team-Size Constraint Check
**Verification:** The constraint is genuinely enforced. The algorithm uses a strict `while len(selected) < team_size` loop, preventing the team from exceeding the required size limit. The 100% coverage is achieved *within* the limits, not by cheating the size constraint.

## 6. Intentional Skill Gaps Check
**Verification:** There are **zero** projects with intentional skill gaps. The dataset does not contain any "unfulfillable" requirements designed to test the algorithm's fallback or partial-coverage behavior.

## 7. Conclusion

**Verdict: B & C - The result is mathematically correct but the dataset is too easy AND there is a methodology flaw in the coverage definition.**

The 100% reported skill coverage is the genuine mathematical output of the current `team_service.py` algorithm running on the evaluation dataset. However, the evaluation is flawed for two reasons:

1. **Dataset is too easy (B):** The synthetic pool is densely populated with the exact skills needed, and there are no "impossible" constraints (e.g., a project needing 6 distinct rare skills but only allowing a team size of 2).
2. **Implementation Flaw (C):** The coverage algorithm ignores proficiency thresholds. Because any candidate with even trivial experience in a skill counts as a full match, the algorithm never struggles to "cover" a requirement.

### Recommendations for a Better Evaluation Design:
To produce a research-grade evaluation, the dataset should be rebuilt to include:
- **Fully Coverable Projects:** Control group (like the current dataset).
- **Partially Coverable Projects:** Team size restricted to 2, but 6 distinct skills required.
- **Projects with Missing Skills:** Requires a rare skill (e.g., "Cobol") that 0 candidates possess.
- **Proficiency Mismatches:** A project requiring Level 5 in a skill, where candidates only possess Level 2. (Note: this will require modifying the production `team_service.py` algorithm to respect proficiency thresholds during coverage calculation).
- **Availability Constraints:** Projects that overlap in time, forcing the algorithm to choose secondary candidates because the primary experts are at 0% capacity.
