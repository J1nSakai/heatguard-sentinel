"""
agent/escalation.py

RECONCILED VERSION — now uses config/osha_thresholds.json (heat-index
temperature ranges) for tier classification, matching Person B/C's
insights/site_report.py, instead of the old persistence-duration-based
TIERS dict.

Old tier logic (persistence hours) has been dropped to avoid two
conflicting definitions of "risk tier" existing in the same project.
"""

import sys
import os
import json
from datetime import datetime
from agent.monitor import get_current_exceedance, get_persistence, simulate_breach
from agent.notifier import send_alert
from agent.llm_phrasing import phrase_alert

OSHA_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "osha_thresholds.json")

with open(OSHA_CONFIG_PATH) as f:
    OSHA_TIERS = json.load(f)  # list of {level, risk_label, heat_index_c_min, heat_index_c_max, guidance}


def classify_by_heat_index(heat_index_c: float) -> dict:
    """
    Matches a heat index value against config/osha_thresholds.json tiers.
    Returns the matching tier dict (level, risk_label, guidance).
    """
    for tier in OSHA_TIERS:
        min_c = tier["heat_index_c_min"]
        max_c = tier["heat_index_c_max"]
        if heat_index_c >= min_c and (max_c is None or heat_index_c < max_c):
            return tier
    # fallback if nothing matches (shouldn't happen with well-formed config)
    return {"level": "unknown", "risk_label": "Unknown", "guidance": "Check manually."}


def evaluate_site(simulate: bool = False, simulate_hours: float = 7.0,
                   simulate_heat_index_c: float = 42.0) -> dict:
    """
    simulate=True bypasses real API calls and injects fake high values —
    for demo/rehearsal only.

    NOTE: tier is now based on current heat_index_celsius (temperature),
    not on persistence duration. Persistence/exceedance are still tracked
    and reported, but they no longer drive the tier decision — they're
    context, matching how Person B's site_report.py treats them.
    """
    exceedance_data = get_current_exceedance()

    if simulate:
        persistence_data = simulate_breach(persistence_hours=simulate_hours)
        heat_index_c = simulate_heat_index_c
    else:
        persistence_data = get_persistence()
        # TODO: pull real current heat_index_c from monitor.py's env_params
        # call once that's wired to also fetch heat_index_celsius. Placeholder
        # for now — coordinate with Person B on where this should live.
        heat_index_c = 35.0

    persistence_hours = persistence_data["site_persistence_hours"]
    tier = classify_by_heat_index(heat_index_c)

    decision = {
        "timestamp": datetime.now().isoformat(),
        "exceedance_hours": exceedance_data["site_exceedance_hours"],
        "persistence_hours": persistence_hours,
        "heat_index_c": heat_index_c,
        "risk_level": tier["level"],          # "lower" | "moderate" | "high" | "very_high"
        "risk_label": tier["risk_label"],     # matches Person B's vocabulary
        "guidance": tier.get("guidance", ""),
        "action": None,
        "simulated": simulate,
    }

    if tier["level"] == "lower":
        decision["action"] = "log_only"
    else:
        decision["action"] = "alert"
        decision["explanation"] = phrase_alert_compat(decision)
        send_alert(decision)

    return decision


def phrase_alert_compat(decision: dict) -> str:
    """
    Adapts the new decision shape to what llm_phrasing.py's phrase_alert()
    expects (recommended_response, risk_tier, threshold_c, persistence_hours).
    Keeps llm_phrasing.py unchanged.
    """
    compat_decision = {
        "risk_tier": decision["risk_level"],
        "threshold_c": decision["heat_index_c"],
        "persistence_hours": decision["persistence_hours"],
        "recommended_response": decision["guidance"],
    }
    return phrase_alert(compat_decision)


if __name__ == "__main__":
    simulate_mode = "--simulate" in sys.argv
    result = evaluate_site(simulate=simulate_mode)
    print(result)