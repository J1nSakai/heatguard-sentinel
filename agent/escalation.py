"""
agent/escalation.py

Decision logic: takes monitor.py's exceedance/persistence data and decides
whether to just log it, or escalate to an active alert.

This is the "agentic" core — the system decides and acts on its own,
no manual check required.

DEMO MODE: run with `python -m agent.escalation --simulate` to force a
high-persistence reading through the pipeline (real alert fire, real
notifier.py write, real llm_phrasing call) without waiting for actual
weather to cross the threshold. Use this for rehearsal/demo day.
"""

import sys
from datetime import datetime
from agent.monitor import get_current_exceedance, get_persistence, simulate_breach
from agent.notifier import send_alert
from agent.llm_phrasing import phrase_alert

TIERS = {
    "low":      {"max_persistence_hours": 1},
    "moderate": {"max_persistence_hours": 3},
    "high":     {"max_persistence_hours": 6},
    "extreme":  {"max_persistence_hours": float("inf")},
}


def classify_risk(persistence_hours: float) -> str:
    if persistence_hours <= TIERS["low"]["max_persistence_hours"]:
        return "low"
    elif persistence_hours <= TIERS["moderate"]["max_persistence_hours"]:
        return "moderate"
    elif persistence_hours <= TIERS["high"]["max_persistence_hours"]:
        return "high"
    else:
        return "extreme"


def evaluate_site(simulate: bool = False) -> dict:
    """
    simulate=True skips the real persistence API call and injects a high
    value instead — for demo/rehearsal, so the alert flow can be shown
    reliably regardless of current actual weather.
    """
    exceedance_data = get_current_exceedance()

    if simulate:
        persistence_data = simulate_breach(persistence_hours=7.0)
    else:
        persistence_data = get_persistence()

    persistence_hours = persistence_data["site_persistence_hours"]
    risk_tier = classify_risk(persistence_hours)

    decision = {
        "timestamp": datetime.now().isoformat(),
        "exceedance_hours": exceedance_data["site_exceedance_hours"],
        "persistence_hours": persistence_hours,
        "threshold_c": exceedance_data["threshold_c"],
        "risk_tier": risk_tier,
        "action": None,
        "simulated": simulate,
    }

    if risk_tier == "low":
        decision["action"] = "log_only"
    else:
        decision["action"] = "alert"
        decision["recommended_response"] = _recommend_action(risk_tier)
        decision["explanation"] = phrase_alert(decision)
        send_alert(decision)

    return decision


def _recommend_action(risk_tier: str) -> str:
    recommendations = {
        "moderate": "Increase water-break frequency to every 30 min.",
        "high": "Mandate 15-min shaded break; monitor workers for symptoms.",
        "extreme": "Suspend high-exertion tasks; mandatory shaded rest until risk drops.",
    }
    return recommendations.get(risk_tier, "Monitor conditions.")


if __name__ == "__main__":
    simulate_mode = "--simulate" in sys.argv
    result = evaluate_site(simulate=simulate_mode)
    print(result)