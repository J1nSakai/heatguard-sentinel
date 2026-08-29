"""
agent/escalation.py

Real-time risk classification: pulls current apparent_temperature for a
site, classifies it against config/osha_thresholds.json tiers, and
decides whether to log or alert.

Historical context (exceedance/persistence over the past week) is pulled
via Person B's insights/historical.py functions — NOT re-implemented here,
to avoid duplicate FortyGuard API calls and mismatched numbers between
Person A and Person B's outputs.
"""

import sys
import json
from datetime import date, timedelta
from pathlib import Path
from fortyguard import FortyGuardClient

from agent.monitor import (
    get_current_conditions,
    get_current_conditions_for_zone,
    simulate_conditions,
    simulate_conditions_for_zone,
)
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
    """Matches current apparent temperature against OSHA tier bands."""
    for tier in OSHA_TIERS:
        min_c = tier["heat_index_c_min"]
        max_c = tier["heat_index_c_max"]
        if apparent_temp_c >= min_c and (max_c is None or apparent_temp_c < max_c):
            return tier
    return {"level": "unknown", "risk_label": "Unknown", "guidance": "Check manually."}


def get_historical_context(zone: dict, days_back: int = 7) -> dict:
    """
    Pulls exceedance/persistence over the past week using Person B's
    cached functions — reused here (not duplicated) as context for the
    alert, matching site_report.py's approach.
    """
    client = FortyGuardClient()
    threshold_c = load_osha_threshold_celsius("high")  # 39.4°C Danger tier

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
                   include_historical: bool = True) -> dict:
    """
    Core agent step for ONE site: get current conditions, classify tier,
    decide action, optionally attach historical context, alert if needed.
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
        send_alert(decision)

    return decision


def _to_llm_shape(decision: dict) -> dict:
    """Adapts the decision dict to what llm_phrasing.py's phrase_alert() expects."""
    # mean_hours is None when FortyGuard had no tiles for this AOI (see
    # insights/historical.py summarize_stats). llm_phrasing formats this with
    # :.1f, so None would raise — fall back to 0.0 for the phrasing only.
    # The alert still fires on the CURRENT temperature reading, which is
    # measured independently of the historical tiles.
    persistence_hours = (
        decision.get("historical_context", {})
        .get("persistence", {})
        .get("mean_hours")
    )
    return {
        "risk_tier": decision["risk_level"],
        "threshold_c": decision["apparent_temperature_c"],
        "persistence_hours": 0.0 if persistence_hours is None else persistence_hours,
        "recommended_response": decision["guidance"],
    }


def _now_iso() -> str:
    from datetime import datetime
    return datetime.now().isoformat()


def evaluate_pinned_zone(
    zone: dict,
    min_tier: str = "moderate",
    recipient: str = None,
    include_historical: bool = False,
    simulate: bool = False,
    simulate_temp_c: float = 42.0,
) -> dict:
    """
    Same classification step as evaluate_site, but for a zone DICT — a
    freshly pinned coordinate that isn't in config/multi_zones.json.

    Two differences from evaluate_site, both driven by subscriptions:
      - `min_tier` decides what counts as alert-worthy, instead of hardcoding
        "anything above lower". A manager who subscribed at "high" shouldn't
        get emailed for Extreme Caution.
      - `recipient` routes the email to the subscriber rather than the global
        ALERT_EMAIL_TO in .env.

    include_historical defaults to False here: a subscription check runs
    repeatedly, and the exceedance/persistence calls are the expensive part.
    The alert itself only needs the CURRENT reading.
    """
    from agent.subscriptions import tier_meets_threshold

    if simulate:
        conditions = simulate_conditions_for_zone(zone, apparent_temp_c=simulate_temp_c)
    else:
        conditions = get_current_conditions_for_zone(zone)

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
        decision["historical_context"] = get_historical_context(zone)

    if tier_meets_threshold(tier["level"], min_tier):
        decision["action"] = "alert"
        decision["explanation"] = phrase_alert(_to_llm_shape(decision))
        send_alert(decision, recipient=recipient)
    else:
        decision["action"] = "log_only"

    return decision


if __name__ == "__main__":
    simulate_mode = "--simulate" in sys.argv
    zone_id = sys.argv[sys.argv.index("--zone") + 1] if "--zone" in sys.argv else "construction_downtown"
    result = evaluate_site(zone_id, simulate=simulate_mode, include_historical=not simulate_mode)
    print(result)