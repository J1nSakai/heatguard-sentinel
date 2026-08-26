"""
api/routes/zones.py

Two ways a report gets requested, matching the finalized user flow
(pin a location on the map):

  GET  /zones                  -> the 3 pre-loaded demo zones (fallback
                                   list, also useful while frontend map
                                   integration isn't wired up yet)
  GET  /zones/{zone_id}/report -> full site report for one of those saved zones
  POST /zones/report           -> full site report for a FRESHLY PINNED
                                   {lat, lon} — no zone_id required, this is
                                   the real "click the map" path
"""

import json
from pathlib import Path

import requests
from fastapi import APIRouter, HTTPException

from fortyguard.exceptions import FortyGuardError, TaskTimeoutError
from insights.site_report import generate_site_report, generate_site_report_by_id
from api.models.pinned_location import PinnedLocation

router = APIRouter(prefix="/zones", tags=["zones"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ZONES_PATH = REPO_ROOT / "config" / "multi_zones.json"
ALERTS_LOG_PATH = REPO_ROOT / "data" / "logs" / "alerts.jsonl"


def _safe_report(build_report, *args, **kwargs) -> dict:
    """
    Runs a report builder and converts upstream FortyGuard failures into
    proper HTTP errors instead of letting them surface as an unhandled 500
    with a raw traceback.

    Observed for real during testing: the FortyGuard API dropped the
    connection mid-report twice (DNS resolution failure, then
    RemoteDisconnected). Without this, the frontend gets a 500 and no
    usable message — bad on stage, and Person C can't tell "retry this"
    apart from "your request was wrong".

    Status codes chosen so the frontend can decide what to do:
      503 -> transient, safe to retry (network dropped, or task timed out)
      502 -> upstream API returned an actual error (retrying won't help much)
    Both include a human-readable `detail` for display.
    """
    try:
        return build_report(*args, **kwargs)
    except requests.exceptions.RequestException as exc:
        # Network-level: DNS failure, connection reset, read timeout.
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not reach the FortyGuard API (network error). "
                "This is usually transient — please retry."
            ),
        ) from exc
    except TaskTimeoutError as exc:
        # Caught before FortyGuardError — TaskTimeoutError subclasses it.
        raise HTTPException(
            status_code=503,
            detail=(
                "The FortyGuard analysis did not finish in time. "
                "Please retry — partial results are already cached, so a "
                "retry will be faster."
            ),
        ) from exc
    except FortyGuardError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"FortyGuard API error: {exc}",
        ) from exc


@router.get("")
def list_zones():
    """The 3 pre-loaded demo zones — used as a fallback list and for the
    demo safety net (see team notes: live map click could fail on stage)."""
    zones = json.loads(ZONES_PATH.read_text())["zones"]
    return {"zones": zones}


@router.get("/{zone_id}/report")
def get_zone_report(zone_id: str, window_days: int = 7, profile_days: int = 3):
    """Full site report for one of the pre-loaded demo zones."""
    # Unknown zone_id is a client error (404) and must not be swallowed by
    # _safe_report's upstream-failure handling, so it's resolved separately.
    zones = json.loads(ZONES_PATH.read_text())["zones"]
    if not any(z["id"] == zone_id for z in zones):
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")

    return _safe_report(
        generate_site_report_by_id,
        zone_id,
        window_days=window_days,
        profile_days=profile_days,
    )


@router.post("/report")
def get_pinned_report(location: PinnedLocation):
    """
    Full site report for a freshly pinned map location — the real
    "site manager clicks the map" path. No zone_id needed; the backend
    builds a small AOI box around whatever coordinate comes in.
    """
    zone = {
        "id": f"pinned_{location.lat}_{location.lon}",
        "name": location.name,
        "worker_type": location.worker_type,
        "lat": location.lat,
        "lon": location.lon,
    }
    return _safe_report(
        generate_site_report,
        zone,
        window_days=location.window_days,
        profile_days=location.profile_days,
    )


@router.get("/{zone_id}/alerts")
def get_zone_alerts(zone_id: str, limit: int = 50):
    """
    Person A's real-time alert log — kept as a SEPARATE endpoint from
    /report (which is B's computed historical pattern data), since these
    are two different kinds of data: a log of past alert events vs. a
    freshly computed analysis.

    Reads data/logs/alerts.jsonl (one JSON decision object per line, per
    shared/schema.py) and returns entries matching this zone.

    The zone-identifier gap is resolved: agent/escalation.py now writes both
    `zone_id` and `zone_name` into every decision object, so the filter below
    works. `site_name` is still checked as a fallback for any older entries.
    Returns [] until the agent has actually fired an alert above the "lower"
    tier — the log file doesn't exist before then.
    """
    if not ALERTS_LOG_PATH.exists():
        return {"zone_id": zone_id, "alerts": []}

    alerts = []
    with open(ALERTS_LOG_PATH, "r") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue  # skip malformed lines rather than fail the whole request
            if entry.get("zone_id") == zone_id or entry.get("site_name") == zone_id:
                alerts.append(entry)

    return {"zone_id": zone_id, "alerts": alerts[-limit:]}