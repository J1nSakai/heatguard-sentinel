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

from fastapi import APIRouter, HTTPException

from insights.site_report import generate_site_report, generate_site_report_by_id
from api.models.pinned_location import PinnedLocation

router = APIRouter(prefix="/zones", tags=["zones"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ZONES_PATH = REPO_ROOT / "config" / "multi_zones.json"
ALERTS_LOG_PATH = REPO_ROOT / "data" / "logs" / "alerts.jsonl"





@router.get("")
def list_zones():
    """The 3 pre-loaded demo zones — used as a fallback list and for the
    demo safety net (see team notes: live map click could fail on stage)."""
    zones = json.loads(ZONES_PATH.read_text())["zones"]
    return {"zones": zones}


@router.get("/{zone_id}/report")
def get_zone_report(zone_id: str, window_days: int = 7, profile_days: int = 3):
    """Full site report for one of the pre-loaded demo zones."""
    try:
        return generate_site_report_by_id(zone_id, window_days=window_days, profile_days=profile_days)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")


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
    return generate_site_report(zone, window_days=location.window_days, profile_days=location.profile_days)


@router.get("/{zone_id}/alerts")
def get_zone_alerts(zone_id: str, limit: int = 50):
    """
    Person A's real-time alert log — kept as a SEPARATE endpoint from
    /report (which is B's computed historical pattern data), since these
    are two different kinds of data: a log of past alert events vs. a
    freshly computed analysis.

    Reads data/logs/alerts.jsonl (one JSON decision object per line, per
    shared/schema.py) and returns entries matching this zone.

    KNOWN GAP: the decision object shape in shared/schema.py doesn't
    currently include a zone identifier field (no "zone_id" or "site_name"
    listed). This checks both, defensively, but will return nothing until
    Person A adds one — worth confirming with them directly.
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