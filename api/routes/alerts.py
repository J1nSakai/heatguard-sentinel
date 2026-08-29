"""
api/routes/alerts.py

Optional alert subscriptions for a pinned location, plus a read view of the
alerts the agent has actually fired.

  POST   /alerts/subscriptions        -> subscribe a pinned {lat, lon} + email
  GET    /alerts/subscriptions        -> list saved subscriptions
  DELETE /alerts/subscriptions/{id}   -> unsubscribe
  POST   /alerts/subscriptions/{id}/check -> evaluate ONE subscription now
  GET    /alerts                      -> the agent's fired-alert log

The subscription itself is just storage — it does not poll on its own. The
agent pass that actually sends emails is agent/run_subscriptions.py, run on
a schedule. The /check endpoint exists so the UI can offer a "test this now"
button and so the alert path is demonstrable without waiting for cron.

/alerts reads the same data/logs/alerts.jsonl that
GET /zones/{zone_id}/alerts filters by zone — this route is the unfiltered,
newest-first view the frontend's Alerts tab renders.
"""

import json
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException

from agent.subscriptions import (
    TIER_ORDER,
    add_subscription,
    get_subscription,
    list_subscriptions,
    mark_checked,
    remove_subscription,
    subscription_to_zone,
)
from api.models.subscription import SubscriptionCreate
from fortyguard.exceptions import FortyGuardError, TaskTimeoutError

router = APIRouter(prefix="/alerts", tags=["alerts"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ALERTS_LOG_PATH = REPO_ROOT / "data" / "logs" / "alerts.jsonl"


@router.get("")
def list_alerts(limit: int = 50, zone_id: str = None):
    """
    The agent's fired-alert log, newest first.

    Returns [] (not an error) until the agent has actually alerted — the log
    file doesn't exist before then, which is the normal state on a fresh
    checkout. Optionally filter by zone_id.
    """
    if not ALERTS_LOG_PATH.exists():
        return {"alerts": [], "count": 0}

    entries = []
    with open(ALERTS_LOG_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue  # skip malformed lines rather than fail the request
            if zone_id and entry.get("zone_id") != zone_id:
                continue
            entries.append(entry)

    # Newest first — the log is append-ordered, so reverse the tail.
    newest = list(reversed(entries[-limit:]))
    return {"alerts": newest, "count": len(entries)}


@router.get("/subscriptions")
def get_subscriptions():
    return {"subscriptions": list_subscriptions()}


@router.post("/subscriptions", status_code=201)
def create_subscription(body: SubscriptionCreate):
    """
    Subscribe an email to heat alerts for a pinned coordinate.

    Idempotent for the same email + same spot: a repeat POST updates the
    existing subscription instead of creating a duplicate (double-clicking
    the button shouldn't mean two emails per alert).
    """
    if body.min_tier not in TIER_ORDER:
        raise HTTPException(
            status_code=422,
            detail=f"min_tier must be one of {TIER_ORDER}",
        )

    record = add_subscription(
        lat=body.lat,
        lon=body.lon,
        email=body.email,
        name=body.name,
        worker_type=body.worker_type,
        min_tier=body.min_tier,
    )
    return record


@router.delete("/subscriptions/{sub_id}")
def delete_subscription(sub_id: str):
    if not remove_subscription(sub_id):
        raise HTTPException(status_code=404, detail=f"Subscription '{sub_id}' not found")
    return {"deleted": sub_id}


@router.post("/subscriptions/{sub_id}/check")
def check_subscription(sub_id: str, simulate: bool = False, simulate_temp_c: float = 42.0):
    """
    Evaluate one subscription right now, sending an email if the current tier
    meets its threshold. Powers a "test alert" button and makes the agent path
    demonstrable without waiting for the scheduled pass.

    `simulate=true` uses the demo safety net (no live API call) — useful if
    the network is unreliable on stage.
    """
    sub = get_subscription(sub_id)
    if sub is None:
        raise HTTPException(status_code=404, detail=f"Subscription '{sub_id}' not found")

    # Imported here rather than at module scope: escalation.py constructs a
    # FortyGuardClient at import time via agent/monitor.py, so a missing API
    # key would otherwise break the whole app's startup instead of just this
    # one endpoint.
    from agent.escalation import evaluate_pinned_zone

    try:
        decision = evaluate_pinned_zone(
            subscription_to_zone(sub),
            min_tier=sub["min_tier"],
            recipient=sub["email"],
            simulate=simulate,
            simulate_temp_c=simulate_temp_c,
        )
    except requests.exceptions.RequestException as exc:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not reach the FortyGuard API (network error). "
                "This is usually transient — please retry."
            ),
        ) from exc
    except TaskTimeoutError as exc:
        raise HTTPException(
            status_code=503,
            detail="The FortyGuard request timed out. Please retry.",
        ) from exc
    except FortyGuardError as exc:
        raise HTTPException(status_code=502, detail=f"FortyGuard API error: {exc}") from exc

    mark_checked(sub_id, alerted=decision["action"] == "alert")
    return decision
