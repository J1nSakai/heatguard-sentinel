"""
agent/escalation.py

Decision logic: takes monitor.py's exceedance/persistence data and decides
whether to just log it, or escalate to an active alert.

This is the "agentic" core — the system decides and acts on its own,
no manual check required.
"""

from datetime import datetime
from agent.monitor import get_current_exceedance, get_persistence
from agent.notifier import send_alert

# --- Escalation tiers (based on OSHA heat index risk categories) ---
# Adjust these based on your team's Day-1 OSHA research.
TIERS = {
    "low":      {"max_persistence_hours": 1},
    "moderate": {"max_persistence_hours": 3},
    "high":     {"max_persistence_hours": 6},
    "extreme":  {"max_persistence_hours": float("inf")},
}


def classify_risk(persistence_hours: float) -> str:
    """Maps persistence duration to an OSHA-style risk tier."""
    if persistence_hours <= TIERS["low"]["max_persistence_hours"]:
        return "low"
    elif persistence_hours <= TIERS["moderate"]["max_persistence_hours"]:
        return "moderate"
    elif persistence_hours <= TIERS["high"]["max_persistence_hours"]:
        return "high"
    else:
        return "extreme"


def evaluate_site() -> dict:
    """
    Core agent loop step: pull current data, classify risk, decide action.
    Returns a decision record — this is what gets logged AND what triggers
    notifier.py if escalation is warranted.
    """
    exceedance_data = get_current_exceedance()
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
    }

    # --- Autonomous decision ---
    if risk_tier in ("low",):
        decision["action"] = "log_only"
    elif risk_tier in ("moderate", "high", "extreme"):
        decision["action"] = "alert"
        decision["recommended_response"] = _recommend_action(risk_tier)
        # Agent acts on its own here — no manual trigger
        send_alert(decision)
    else:
        decision["action"] = "log_only"

    return decision


def _recommend_action(risk_tier: str) -> str:
    """Plain recommendation text — LLM phrasing layer (Day 7) will make this richer."""
    recommendations = {
        "moderate": "Increase water-break frequency to every 30 min.",
        "high": "Mandate 15-min shaded break; monitor workers for symptoms.",
        "extreme": "Suspend high-exertion tasks; mandatory shaded rest until risk drops.",
    }
    return recommendations.get(risk_tier, "Monitor conditions.")


if __name__ == "__main__":
    result = evaluate_site()
    print(result)