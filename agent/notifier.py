"""
agent/notifier.py

Fires alerts when escalation.py decides risk warrants one.
MVP version: logs to a local JSON file + prints. Taimoor will wire this to
a real webhook/email in Day 6 (per the plan) — this gives everyone else
something to integrate against in the meantime.
"""

import json
import os
from datetime import datetime

LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "logs", "alerts.jsonl")


def send_alert(decision: dict) -> None:
    """
    Called by escalation.py when action == "alert".
    MVP: writes to a local log file (data/logs/alerts.jsonl) that the API
    layer (api/routes/zones.py) can read and serve to the frontend.
    Real notification (webhook/email) gets added here later without
    changing escalation.py's interface.
    """
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

    with open(LOG_PATH, "a") as f:
        f.write(json.dumps(decision) + "\n")

    print(f"[ALERT FIRED] {decision['timestamp']} — "
          f"tier={decision['risk_tier']} — "
          f"{decision.get('recommended_response', '')}")

    # TODO (Taimoor, Day 6): replace/extend with real webhook call, e.g.
    # requests.post(WEBHOOK_URL, json=decision)