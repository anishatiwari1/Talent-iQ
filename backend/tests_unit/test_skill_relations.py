"""Related-skill suggestions, RELATED_TO sync, and the curated list --
all without a database or a Neo4j server."""
from types import SimpleNamespace as N

from app import seed
from app.services import graph_sync_service, skill_suggestion_service as ss


class ReadOnlyDB:
    def __init__(self, *results):
        self.results = list(results)

    def scalars(self, stmt):
        rows = self.results.pop(0)
        return N(all=lambda: list(rows))

    def _write(self, *args, **kwargs):
        raise AssertionError("suggestions must not write to the database")

    add = delete = flush = commit = _write


def skill(skill_id, name):
    return N(id=skill_id, name=name)


def gap_row(skill_id, name, status, required=4):
    return {"skill_id": skill_id, "skill_name": name, "coverage_status": status, "required_level": required}


def holder(employee_id, skill_id, level):
    return N(employee_id=employee_id, skill_id=skill_id, proficiency_level=level,
             employee=N(user=N(full_name=f"Employee {employee_id}")))


PYTHON, FASTAPI, REST, DOCKER = skill(1, "Python"), skill(2, "FastAPI"), skill(3, "REST API"), skill(4, "Docker")


def _suggest(monkeypatch, rows, relations, holders, roster_ids=()):
    monkeypatch.setattr(ss.skill_gap_service, "analyze_project_gaps", lambda db, p: rows)
    monkeypatch.setattr(ss.project_service, "get_project_staffing",
                        lambda db, p: [N(employee_id=i) for i in roster_ids])
    return ss.related_skill_suggestions(ReadOnlyDB(relations, holders), N(id=7))


def test_suggestions_never_count_toward_coverage(monkeypatch):
    result = _suggest(monkeypatch, [gap_row(2, "FastAPI", "MET")], [], [])
    assert result["counts_toward_coverage"] is False
    assert result["suggestions"] == []


def test_relations_are_followed_from_either_end(monkeypatch):
    rows = [gap_row(1, "Python", "NOT_EVIDENCED"), gap_row(3, "REST API", "BELOW_REQUIRED")]
    relations = [
        N(skill_id=1, related_skill_id=2, skill=PYTHON, related_skill=FASTAPI, relation_type="FRAMEWORK_OF", note=None),
        N(skill_id=2, related_skill_id=3, skill=FASTAPI, related_skill=REST, relation_type="COMPLEMENTARY", note=None),
    ]
    result = _suggest(monkeypatch, rows, relations, [holder(10, 2, 4)])
    by_skill = {s["skill_name"]: s for s in result["suggestions"]}
    assert [r["skill_name"] for r in by_skill["Python"]["related_skills"]] == ["FastAPI"]
    assert [r["skill_name"] for r in by_skill["REST API"]["related_skills"]] == ["FastAPI"]
    assert by_skill["Python"]["related_skills"][0]["relation_type"] == "FRAMEWORK_OF"


def test_current_staff_are_listed_first(monkeypatch):
    relations = [N(skill_id=1, related_skill_id=2, skill=PYTHON, related_skill=FASTAPI, relation_type="FRAMEWORK_OF", note=None)]
    holders = [holder(10, 2, 5), holder(11, 2, 3)]
    result = _suggest(monkeypatch, [gap_row(1, "Python", "BELOW_REQUIRED")], relations, holders, roster_ids=[11])
    listed = result["suggestions"][0]["related_skills"][0]["holders"]
    assert [(h["employee_id"], h["on_project"]) for h in listed] == [(11, True), (10, False)]


def test_holder_list_is_capped_but_counted(monkeypatch):
    relations = [N(skill_id=1, related_skill_id=2, skill=PYTHON, related_skill=FASTAPI, relation_type="FRAMEWORK_OF", note=None)]
    holders = [holder(i, 2, 3) for i in range(8)]
    related = _suggest(monkeypatch, [gap_row(1, "Python", "NO_STAFF")], relations, holders)["suggestions"][0]["related_skills"][0]
    assert related["holder_count"] == 8
    assert len(related["holders"]) == ss.HOLDERS_PER_RELATED_SKILL


def test_unmet_requirement_without_relations_is_omitted(monkeypatch):
    result = _suggest(monkeypatch, [gap_row(4, "Docker", "NOT_EVIDENCED")], [], [])
    assert result["suggestions"] == []


# --- Neo4j sync (fake transaction) ---------------------------------------

class FakeTx:
    def __init__(self, pruned=0):
        self.calls = []
        self.pruned = pruned

    def run(self, query, **params):
        self.calls.append((query, params))
        return N(single=lambda: {"pruned": self.pruned})


def test_relation_sync_merges_then_prunes_missing_pairs():
    tx = FakeTx(pruned=2)
    stats = graph_sync_service.sync_skill_relations_tx(tx, [
        {"skill_id": 1, "related_skill_id": 2, "relation_type": "FRAMEWORK_OF", "source": "CURATED"},
    ])
    assert stats == {"synced": 1, "pruned": 2}
    merge_query, prune_query = tx.calls[0][0], tx.calls[1][0]
    assert "MERGE (a)-[r:RELATED_TO]->(b)" in merge_query
    assert "DELETE r" in prune_query
    assert tx.calls[1][1]["keys"] == ["1:2"]


def test_relation_sync_with_no_relations_prunes_everything():
    tx = FakeTx()
    stats = graph_sync_service.sync_skill_relations_tx(tx, [])
    assert stats["synced"] == 0
    assert len(tx.calls) == 1 and tx.calls[0][1]["keys"] == []


def test_employee_sync_writes_is_active():
    tx = FakeTx()
    graph_sync_service.sync_employees_tx(tx, [{"id": 1, "name": "A", "department": "Eng",
                                              "employee_code": "E1", "job_title": "Dev", "is_active": False}])
    assert "e.is_active = row.is_active" in tx.calls[0][0]


# --- Curated list -------------------------------------------------------

def test_curated_relations_use_known_skills_and_have_no_duplicates():
    names = {name for name, _ in seed.SKILLS}
    pairs = set()
    for a, b, relation_type in seed.SKILL_RELATIONS:
        assert a in names and b in names and a != b
        assert relation_type in {"FRAMEWORK_OF", "SAME_FAMILY", "COMPLEMENTARY"}
        pair = frozenset((a, b))
        assert pair not in pairs, pair
        pairs.add(pair)
