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
from fortyguard import FortyGuardClient

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
ZONES_PATH = REPO_ROOT / "config" / "multi_zones.json"
THRESHOLDS_PATH = REPO_ROOT / "config" / "osha_thresholds.json"

# ~300m box around the zone point. create_heatmap needs a polygon AOI,
# not a single point, so we buffer the zone's lat/lon into a small square.
BUFFER_DEG = 0.0015  # roughly 150m in each direction -> ~300m box

# Coverage is patchy: a pinned coordinate can land in a gap where FortyGuard
# returns n_cells=0 even though a point ~2km away has full tiles (observed
# for real: 33.4376,-112.0457 empty vs 33.4484,-112.074 with 16 cells).
# Rather than telling the user "no data", widen the AOI and ask again — a
# larger box around the same point is still an honest answer about that
# site, just averaged over a bigger area. We report which radius was used.
AOI_LADDER_DEG = [BUFFER_DEG, 0.0045, 0.0135]  # ~300m, ~900m, ~2.7km boxes


def _deg_to_box_metres(buffer_deg: float) -> int:
    """Approximate box edge length in metres, for reporting to the user.
    1 degree latitude ~= 111km; the box spans 2 * buffer_deg."""
    return int(round(2 * buffer_deg * 111_000, -1))


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


from insights.schema_cache import get_or_fetch


def _cache_analytic_key(analytic_type: str, buffer_deg: float) -> str:
    """Cache-key suffix so each AOI radius caches separately.

    The default radius keeps its bare name ("exceedance") so every cache
    file warmed before the AOI ladder existed still hits.
    """
    if buffer_deg == BUFFER_DEG:
        return analytic_type
    return f"{analytic_type}@r{buffer_deg}"


def has_coverage(response: dict) -> bool:
    """True if the heatmap response actually contains tiles.

    A coverage gap comes back as stats_data {"activity_id": ..., "n_cells": 0}
    with no units/min/max/mean and an empty map_data.features.
    """
    try:
        return response["result"]["stats_data"].get("n_cells", 0) > 0
    except (KeyError, TypeError):
        return False


def _get_zone_analytic(
    client: FortyGuardClient,
    zone: dict,
    analytic_type: str,
    start_date: str,
    end_date: str,
    threshold_c: float,
    direction: str,
    granularity: int,
    buffer_deg: float,
) -> dict:
    """One exceedance/persistence call at a specific AOI radius, via the cache."""
    def _fetch():
        aoi = build_zone_polygon(zone["lat"], zone["lon"], buffer_deg=buffer_deg)
        return client.create_heatmap(
            polygon_aoi=aoi,
            start_date=start_date,
            end_date=end_date,
            filter_type=4,
            analytic_type=analytic_type,
            threshold=threshold_c,
            direction=direction,
            granularity=granularity,
        )

    return get_or_fetch(
        zone_id=zone["id"],
        analytic_type=_cache_analytic_key(analytic_type, buffer_deg),
        threshold_c=threshold_c,
        start_date=start_date, end_date=end_date, granularity=granularity,
        fetch_fn=_fetch,
    )


def get_zone_analytic_with_widening(
    client: FortyGuardClient,
    zone: dict,
    analytic_type: str,
    start_date: str,
    end_date: str,
    threshold_c: float,
    direction: str = "above",
    granularity: int = 80,
) -> tuple:
    """
    Fetch exceedance/persistence for a zone, widening the AOI on a coverage
    miss instead of reporting "no data" for a location that does have usable
    information slightly further out.

    Returns (response, buffer_deg_used). If every radius comes back empty,
    returns the last (empty) response so callers can flag no-coverage.
    """
    response = None
    for buffer_deg in AOI_LADDER_DEG:
        response = _get_zone_analytic(
            client=client, zone=zone, analytic_type=analytic_type,
            start_date=start_date, end_date=end_date, threshold_c=threshold_c,
            direction=direction, granularity=granularity, buffer_deg=buffer_deg,
        )
        if has_coverage(response):
            if buffer_deg != BUFFER_DEG:
                print(
                    f"  [widened] {zone['id']} / {analytic_type}: no tiles in the "
                    f"{_deg_to_box_metres(BUFFER_DEG)}m box, using "
                    f"{_deg_to_box_metres(buffer_deg)}m instead"
                )
            return response, buffer_deg
        print(
            f"  [no coverage] {zone['id']} / {analytic_type} at "
            f"{_deg_to_box_metres(buffer_deg)}m box"
        )
    return response, AOI_LADDER_DEG[-1]


def get_zone_exceedance(
    client: FortyGuardClient,
    zone: dict,
    start_date: str,
    end_date: str,
    threshold_c: float,
    direction: str = "above",
    granularity: int = 80,
) -> dict:
    """
    Pull exceedance-hours for one zone over a date range, via the cache.
    Returns {"result": {"stats_data": ..., "map_data": ...}} shape,
    either freshly fetched or replayed from a prior identical request.

    Kept for the callers that don't care about which AOI radius was used
    (Person A's agent). The report path uses the widening variant below.
    """
    response, _ = get_zone_analytic_with_widening(
        client=client, zone=zone, analytic_type="exceedance",
        start_date=start_date, end_date=end_date, threshold_c=threshold_c,
        direction=direction, granularity=granularity,
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
    Pull longest-continuous-stretch data for one zone over a date range,
    via the cache. Same shape as get_zone_exceedance, different analytic_type.
    """
    response, _ = get_zone_analytic_with_widening(
        client=client, zone=zone, analytic_type="persistence",
        start_date=start_date, end_date=end_date, threshold_c=threshold_c,
        direction=direction, granularity=granularity,
    )
    return response


def summarize_stats(response: dict) -> dict:
    """Pull the numbers we care about out of a heatmap response. Works for
    both exceedance and persistence — they share the same stats_data shape.

    When an AOI has NO heat-data coverage, the API returns a degraded
    stats_data of just {"activity_id": ..., "n_cells": 0} — no
    units/min/max/mean — and an empty map_data.features. Observed for real
    with a pinned coordinate in Phoenix.

    Crucially, that is NOT the same as "zero hours above the threshold".
    Reporting 0 would render as 0% time in danger and a reassuring
    "Lower Risk Pattern", i.e. telling a site manager an unmeasured site is
    safe. So the hour fields come back as None and `no_coverage` is set;
    every consumer must treat None as "unknown", never as zero.
    """
    stats = {}
    try:
        stats = response["result"]["stats_data"]
    except (KeyError, TypeError):
        stats = {}

    if stats.get("n_cells", 0) > 0 and "mean" in stats:
        return {
            "units": stats.get("units", "hour"),
            "n_cells": stats["n_cells"],
            "min_hours": stats["min"],
            "max_hours": stats["max"],
            "mean_hours": stats["mean"],
            "no_coverage": False,
        }

    return {
        "units": "hour",
        "n_cells": 0,
        "min_hours": None,
        "max_hours": None,
        "mean_hours": None,
        "no_coverage": True,
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