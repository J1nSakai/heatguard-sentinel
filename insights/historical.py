"""
insights/historical.py
Person B — Day 2 skeleton: pull exceedance data for ONE zone.

Goal for today: prove the pattern works end-to-end for a single zone.
No multi-zone looping, no recommendation logic yet — that's Day 3/4.

Run directly with:  python -m insights.historical
(run from the repo root so the `fortyguard` package and `config/` resolve)
"""

import json
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fortyguard_client import FortyGuardClient

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
ZONES_PATH = REPO_ROOT / "config" / "zones.json"
THRESHOLDS_PATH = REPO_ROOT / "config" / "osha_thresholds.json"

# ~300m box around the zone point. create_heatmap needs a polygon AOI,
# not a single point, so we buffer the zone's lat/lon into a small square.
BUFFER_DEG = 0.0015  # roughly 150m in each direction -> ~300m box


def load_zone(zone_id: str) -> dict:
    zones = json.loads(ZONES_PATH.read_text())["zones"]
    for z in zones:
        if z["id"] == zone_id:
            return z
    raise ValueError(f"Zone '{zone_id}' not found in {ZONES_PATH}")


def load_all_zones() -> list:
    return json.loads(ZONES_PATH.read_text())["zones"]


def load_osha_threshold_celsius(level: str = "high") -> float:
    """Default to the 'high' (Danger) tier's lower bound as our exceedance threshold."""
    tiers = json.loads(THRESHOLDS_PATH.read_text())["tiers"]
    for t in tiers:
        if t["level"] == level:
            return t["heat_index_c_min"]
    raise ValueError(f"OSHA tier '{level}' not found")


def build_zone_polygon(lat: float, lon: float, buffer_deg: float = BUFFER_DEG) -> dict:
    """Build a small square GeoJSON polygon AOI around a zone's point coordinates."""
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [lon - buffer_deg, lat - buffer_deg],
                    [lon + buffer_deg, lat - buffer_deg],
                    [lon + buffer_deg, lat + buffer_deg],
                    [lon - buffer_deg, lat + buffer_deg],
                    [lon - buffer_deg, lat - buffer_deg],
                ]],
            },
        }],
    }


def get_zone_exceedance(
    client: FortyGuardClient,
    zone: dict,
    start_date: str,
    end_date: str,
    threshold_c: float,
    direction: str = "above",
    granularity: int = 80,          # finest available tile size (60/80/100m) — was
                                     # silently defaulting to the coarsest before
) -> dict:
    """
    Pull exceedance-hours for one zone over a date range.
    Returns the raw create_heatmap response (map_data + stats_data).
    """
    aoi = build_zone_polygon(zone["lat"], zone["lon"])
    response = client.create_heatmap(
        polygon_aoi=aoi,
        start_date=start_date,
        end_date=end_date,
        filter_type=4,              # range of days
        analytic_type="exceedance",
        threshold=threshold_c,      # °C — same unit as tcm tile temps
        direction=direction,
        granularity=granularity,
    )
    return response


def get_zone_persistence(
    client: FortyGuardClient,
    zone: dict,
    start_date: str,
    end_date: str,
    threshold_c: float,
    direction: str = "above",
    granularity: int = 80,
) -> dict:
    """
    Pull longest-continuous-stretch data for one zone over a date range.
    Same shape as get_zone_exceedance, different analytic_type.
    """
    aoi = build_zone_polygon(zone["lat"], zone["lon"])
    response = client.create_heatmap(
        polygon_aoi=aoi,
        start_date=start_date,
        end_date=end_date,
        filter_type=4,
        analytic_type="persistence",
        threshold=threshold_c,
        direction=direction,
        granularity=granularity,
    )
    return response


def summarize_stats(response: dict) -> dict:
    """Pull the numbers we care about out of a heatmap response. Works for
    both exceedance and persistence — they share the same stats_data shape."""
    stats = response["result"]["stats_data"]
    return {
        "units": stats["units"],
        "n_cells": stats["n_cells"],
        "min_hours": stats["min"],
        "max_hours": stats["max"],
        "mean_hours": stats["mean"],
    }


if __name__ == "__main__":
    client = FortyGuardClient()

    zone = load_zone("construction_downtown")
    threshold_c = load_osha_threshold_celsius("high")  # 39.4°C = OSHA "Danger" tier

    # Last 7 full days (API has no forecasting, so we always look backward).
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=6)

    print(f"Zone: {zone['name']} ({zone['id']})")
    print(f"Threshold: {threshold_c}°C (OSHA 'high' / Danger tier)")
    print(f"Window: {start} to {end}")

    response = get_zone_exceedance(
        client=client,
        zone=zone,
        start_date=start.isoformat(),
        end_date=end.isoformat(),
        threshold_c=threshold_c,
    )

    summary = summarize_stats(response)
    print("\n--- Exceedance summary ---")
    print(f"Cells in AOI: {summary['n_cells']}")
    print(f"Mean hours above threshold/day-window: {summary['mean_hours']} {summary['units']}")
    print(f"Range: {summary['min_hours']} - {summary['max_hours']} {summary['units']}")