"""
agent/subscriptions.py

Optional alert subscriptions: a site manager who has just pinned a location
can ask to be emailed if that spot crosses an OSHA risk tier.

Storage is a single JSON file under data/ (gitignored), same spirit as the
rest of the project's local-first persistence — no database to stand up
mid-hackathon, and easy to inspect by hand.

A subscription is deliberately just "a pinned coordinate + an email + the
tier at which to start alerting". It reuses Person A's existing agent
pipeline (monitor -> escalation -> notifier) rather than introducing a
second, parallel notion of what counts as an alert.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
STORE_PATH = REPO_ROOT / "data" / "subscriptions.json"

# Alert when the live tier is at or above this level. "moderate" (Extreme
# Caution, 32.2C+) is the default: "lower" would email on merely warm days
# and train people to ignore the alerts.
TIER_ORDER = ["lower", "moderate", "high", "very_high"]
DEFAULT_MIN_TIER = "moderate"


def _read_all() -> list:
    if not STORE_PATH.exists():
        return []
    try:
        return json.loads(STORE_PATH.read_text())["subscriptions"]
    except (json.JSONDecodeError, KeyError):
        # A corrupt store shouldn't take down the API — treat it as empty
        # rather than 500ing every alerts request.
        print(f"  [warn] {STORE_PATH} is unreadable; treating as empty")
        return []


def _write_all(subscriptions: list) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STORE_PATH.write_text(json.dumps({"subscriptions": subscriptions}, indent=2))


def list_subscriptions() -> list:
    return _read_all()


def get_subscription(sub_id: str) -> Optional[dict]:
    for sub in _read_all():
        if sub["id"] == sub_id:
            return sub
    return None


def add_subscription(
    lat: float,
    lon: float,
    email: str,
    name: str = "Pinned Site",
    worker_type: str = "unspecified",
    min_tier: str = DEFAULT_MIN_TIER,
) -> dict:
    """Create a subscription for a pinned coordinate. Returns the stored record."""
    if min_tier not in TIER_ORDER:
        raise ValueError(f"min_tier must be one of {TIER_ORDER}, got {min_tier!r}")

    subscriptions = _read_all()

    # Same email + same spot twice is almost certainly a double-click, not a
    # second subscription. Update the existing one instead of duplicating.
    for sub in subscriptions:
        same_spot = (
            round(sub["lat"], 5) == round(lat, 5)
            and round(sub["lon"], 5) == round(lon, 5)
        )
        if sub["email"].lower() == email.lower() and same_spot:
            sub.update({"name": name, "worker_type": worker_type, "min_tier": min_tier})
            _write_all(subscriptions)
            return sub

    record = {
        "id": uuid.uuid4().hex[:12],
        "lat": lat,
        "lon": lon,
        "name": name,
        "worker_type": worker_type,
        "email": email,
        "min_tier": min_tier,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_checked_at": None,
        "last_alert_at": None,
    }
    subscriptions.append(record)
    _write_all(subscriptions)
    return record


def remove_subscription(sub_id: str) -> bool:
    subscriptions = _read_all()
    remaining = [s for s in subscriptions if s["id"] != sub_id]
    if len(remaining) == len(subscriptions):
        return False
    _write_all(remaining)
    return True


def mark_checked(sub_id: str, alerted: bool) -> None:
    """Record that this subscription was evaluated (and whether it alerted)."""
    subscriptions = _read_all()
    now = datetime.now(timezone.utc).isoformat()
    for sub in subscriptions:
        if sub["id"] == sub_id:
            sub["last_checked_at"] = now
            if alerted:
                sub["last_alert_at"] = now
            break
    _write_all(subscriptions)


def tier_meets_threshold(tier_level: str, min_tier: str) -> bool:
    """True if `tier_level` is at or above the subscription's `min_tier`."""
    if tier_level not in TIER_ORDER or min_tier not in TIER_ORDER:
        return False
    return TIER_ORDER.index(tier_level) >= TIER_ORDER.index(min_tier)


def subscription_to_zone(sub: dict) -> dict:
    """
    Adapt a subscription record to the `zone` dict the agent/insights code
    expects. Uses the same "pinned_<lat>_<lon>" id convention as
    POST /zones/report so cache entries and alert-log filtering line up.
    """
    return {
        "id": f"pinned_{sub['lat']}_{sub['lon']}",
        "name": sub["name"],
        "worker_type": sub["worker_type"],
        "lat": sub["lat"],
        "lon": sub["lon"],
    }
