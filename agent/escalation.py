"""
agent/escalation.py

Real-time risk classification: pulls current apparent_temperature for a
site, classifies it against config/osha_thresholds.json tiers, and
decides whether to log or alert.

Historical context (exceedance/persistence over the past week) is pulled
via Person B's insights/historical.py functions — NOT re-implemented here.
"""

import sys
import json
from datetime import date, timedelta
from pathlib import Path
from fortyguard import FortyGuardClient

from agent.monitor import get_current_conditions, simulate_conditions
from agent.notifier import send_alert
from agent.llm_phrasing import phrase_alert
from insights.historical import (
    load_zone,
    load_osha_threshold_celsius,
    get_zone_exceedance,
    get_zone_persistence,
    summarize_stats,
)

REPO_ROOT = Path(__file__).resolve().parent.parent
OSHA_PATH = REPO_ROOT / "config" / "osha_thresholds.json"

OSHA_TIERS = json.loads(OSHA_PATH.read_text())["tiers"]


def classify_by_apparent_temp(apparent_temp_c: float) -> dict:
    for tier in OSHA_TIERS:
        min_c = tier["heat_index_c_min"]
        max_c = tier["heat_index_c_max"]
        if apparent_temp_c >= min_c and (max_c is None or apparent_temp_c < max_c):
            return tier
    return {"level": "unknown", "risk_label": "Unknown", "guidance": "Check manually."}


def get_historical_context(zone: dict, days_back: int = 7) -> dict:
    client = FortyGuardClient()
    threshold_c = load_osha_threshold_celsius("high")

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days_back - 1)

    exceedance = summarize_stats(get_zone_exceedance(
        client=client, zone=zone,
        start_date=start.isoformat(), end_date=end.isoformat(),
        threshold_c=threshold_c,
    ))
    persistence = summarize_stats(get_zone_persistence(
        client=client, zone=zone,
        start_date=start.isoformat(), end_date=end.isoformat(),
        threshold_c=threshold_c,
    ))
    return {"exceedance": exceedance, "persistence": persistence, "threshold_c": threshold_c}


def evaluate_site(zone_id: str, simulate: bool = False,
                   simulate_temp_c: float = 42.0,
                   include_historical: bool = True,
                   recipient_email: str = None) -> dict:
    """
    Core agent step for ONE site.

    recipient_email: dynamic alert recipient (e.g. from a frontend request
    via api/routes/zones.py's POST /zones/{zone_id}/check). If not given,
    notifier.py falls back to ALERT_EMAIL_TO in .env — keeps this callable
    from the CLI/tests without a frontend attached.
    """
    if simulate:
        conditions = simulate_conditions(zone_id, apparent_temp_c=simulate_temp_c)
    else:
        conditions = get_current_conditions(zone_id)

    tier = classify_by_apparent_temp(conditions["apparent_temperature_c"])

    decision = {
        "zone_id": conditions["zone_id"],
        "zone_name": conditions["zone_name"],
        "timestamp": _now_iso(),
        "apparent_temperature_c": conditions["apparent_temperature_c"],
        "risk_level": tier["level"],
        "risk_label": tier["risk_label"],
        "guidance": tier.get("guidance", ""),
        "action": None,
        "simulated": simulate,
    }

    if include_historical and not simulate:
        zone = load_zone(zone_id)
        decision["historical_context"] = get_historical_context(zone)

    if tier["level"] == "lower":
        decision["action"] = "log_only"
    else:
        decision["action"] = "alert"
        decision["explanation"] = phrase_alert(_to_llm_shape(decision))
        send_alert(decision, recipient_email=recipient_email)

    return decision


def _to_llm_shape(decision: dict) -> dict:
    return {
        "risk_tier": decision["risk_level"],
        "threshold_c": decision["apparent_temperature_c"],
        "persistence_hours": decision.get("historical_context", {})
                                       .get("persistence", {})
                                       .get("mean_hours", 0.0),
        "recommended_response": decision["guidance"],
    }


def _now_iso() -> str:
    from datetime import datetime
    return datetime.now().isoformat()


if __name__ == "__main__":
    simulate_mode = "--simulate" in sys.argv
    zone_id = sys.argv[sys.argv.index("--zone") + 1] if "--zone" in sys.argv else "construction_downtown"
    result = evaluate_site(zone_id, simulate=simulate_mode, include_historical=not simulate_mode)
    print(result)