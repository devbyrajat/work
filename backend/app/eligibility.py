"""Evaluate the published fresh PM-USP CSSS rules without any external requests."""

import json
from pathlib import Path

from pydantic import BaseModel, ConfigDict, StrictBool


class ScholarshipAnswers(BaseModel):
    """Only the six choices needed by the pilot. Missing answers stay unknown."""

    model_config = ConfigDict(extra="forbid")
    recent_class_12: StrictBool | None = None
    first_year_regular_degree: StrictBool | None = None
    recognised_institution: StrictBool | None = None
    board_merit: StrictBool | None = None
    income_within_limit: StrictBool | None = None
    other_aid: StrictBool | None = None


CATALOG = json.loads((Path(__file__).parent / "data/pm-usp-csss.json").read_text(encoding="utf-8"))
RULES = CATALOG["rules"]
SCHEME = {key: value for key, value in CATALOG.items() if key != "rules"}
QUESTIONS = [{key: rule[key] for key in ("field", "question", "hint")} for rule in RULES]
NOTICE = (
    "This is an estimate from your answers and published rules for fresh applicants. "
    "It is not government approval, a merit-list selection, or a submitted application."
)


def evaluate(answers: ScholarshipAnswers) -> dict:
    checks = []
    for rule in RULES:
        answer = getattr(answers, rule["field"])
        if answer is None:
            state, reason = "unknown", "Not answered or not sure. Confirm this before applying."
        elif answer == rule["expected"]:
            state, reason = "met", "Your answer matches this published condition."
        else:
            state, reason = "not_met", rule["failure"]
        checks.append({
            "label": rule["label"],
            "state": state,
            "reason": reason,
            "source": rule["source"],
            "section": rule["section"],
            "quote": rule["quote"],
        })

    states = {check["state"] for check in checks}
    if "not_met" in states:
        status, summary = "Not eligible", "One or more required conditions for a fresh application are not met based on your answers."
    elif states == {"met"}:
        status, summary = "Eligible", "Your answers match all the published conditions checked here. Selection still depends on official verification and merit."
    elif "met" in states:
        status, summary = "Potentially eligible", "Some conditions match. Check the items marked Not sure before deciding whether to apply."
    else:
        status, summary = "Insufficient information", "We need more answers before we can assess this scholarship."
    return {"status": status, "summary": summary, "notice": NOTICE, "checks": checks}
