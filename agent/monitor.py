"""
agent/monitor.py

Pulls CURRENT (real-time) conditions for a given construction site (zone),
used by escalation.py for real-time tier classification.

Historical pattern data (exceedance/persistence over past days) is NOT
duplicated here — that's owned by insights/historical.py (Person B) and
called directly from escalation.py for context, to avoid wasting API
credits on duplicate FortyGuard calls.

Multi-site support: zone is loaded by zone_id from config/multi_zones.json
(the user-pinned or pre-loaded site), not a single hardcoded polygon.

TIMEZONE FIX: date/time for the API request is calculated using Phoenix's
own local time (UTC-7, fixed — Arizona does not observe DST), not the
machine's local system time. Without this, a request made from a timezone
ahead of Phoenix (e.g. Pakistan, UTC+5) can land on a date/time that is
still in the future for Phoenix, which the API rejects (no forecasting
supported on env_params).
"""

import os
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fortyguard import FortyGuardClient

load_dotenv()

client = FortyGuardClient()

REPO_ROOT = Path(__file__).resolve().parent.parent
ZONES_PATH = REPO_ROOT / "config" / "multi_zones.json"

# Anchor temperature for env_params — the API requires a "known current temp"
# input to compute apparent_temperature/heat_index across a 24h profile.
# TODO: replace with a live source if time allows; for now this is a
# reasonable Phoenix-August placeholder, adjustable per test.
DEFAULT_ANCHOR_TEMP_C = 41.0

# Phoenix, Arizona is fixed UTC-7 year-round (no DST observed).
PHOENIX_OFFSET = timezone(timedelta(hours=-7))


def load_zone(zone_id: str) -> dict:
    zones = json.loads(ZONES_PATH.read_text())["zones"]
    for z in zones:
        if z["id"] == zone_id:
            return z
    raise ValueError(f"Zone '{zone_id}' not found in {ZONES_PATH}")


def _phoenix_now_date_time(buffer_minutes: int = 10) -> tuple[str, str]:
    """
    Returns (date_str, time_str) for Phoenix's current local time, minus a
    small buffer, so the request is safely in the past relative to the
    site's own clock — regardless of what timezone this script runs from.
    """
    phoenix_now = datetime.now(PHOENIX_OFFSET) - timedelta(minutes=buffer_minutes)
    return phoenix_now.strftime("%Y-%m-%d"), phoenix_now.strftime("%H:%M")


def get_current_conditions(zone_id: str, anchor_temp_c: float = DEFAULT_ANCHOR_TEMP_C,
                            date_str: str = None, time_str: str = None) -> dict:
    """
    Returns current apparent_temperature_celsius for a site — this is what
    escalation.py compares against OSHA tiers for real-time risk.

    If date_str/time_str aren't given, they're computed from Phoenix's own
    local clock (see _phoenix_now_date_time), not the machine running this
    script — this avoids "future date" API rejections.

    NOTE: uses apparent_temperature_celsius, NOT heat_index_celsius, because
    heat_index_celsius has a known API quirk (peaks ~2am due to how the
    anchor is applied across 24h) — apparent_temperature follows the real
    diurnal cycle and is safe to use at the actual work hour.
    """
    if date_str is None or time_str is None:
        date_str, time_str = _phoenix_now_date_time()

    zone = load_zone(zone_id)

    result = client.environmental_parameters(
        latitude=zone["lat"],
        longitude=zone["lon"],
        temperature=anchor_temp_c,
        start_date=date_str,
        start_time=time_str,
        filter_type=1,
    )

    params = result["result"]["locations"][0]["parameters"]
    return {
        "zone_id": zone_id,
        "zone_name": zone["name"],
        "apparent_temperature_c": params["apparent_temperature_celsius"][0],
        "relative_humidity_pct": params["relative_humidity_percent"][0],
        "aqi": params.get("air_quality:idx", [None])[0],
        "raw_activity_id": result["activity_id"],
        "request_date": date_str,
        "request_time": time_str,
    }


def simulate_conditions(zone_id: str, apparent_temp_c: float = 42.0) -> dict:
    """DEMO SAFETY NET — bypasses the real API call for rehearsal/demo."""
    zone = load_zone(zone_id)
    return {
        "zone_id": zone_id,
        "zone_name": zone["name"],
        "apparent_temperature_c": apparent_temp_c,
        "relative_humidity_pct": None,
        "aqi": None,
        "raw_activity_id": "simulated",
        "request_date": "SIMULATED",
        "request_time": "SIMULATED",
    }


if __name__ == "__main__":
    print(get_current_conditions("construction_downtown"))