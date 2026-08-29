"""
insights/site_report.py
Person B — combines everything from historical.py, risk_scoring.py,
recommender.py, and landcover.py into one clean report per site. This is
the shape api/routes/zones.py hands back for GET /zones/{id}/report.

Run with:  python -m insights.site_report
"""

import json
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
from fortyguard import FortyGuardClient

from insights.historical import load_osha_threshold_celsius, load_zone
from insights.landcover import get_zone_landcover_summary
from insights.recommender import build_daily_time_profile, recommend_safest_time
from insights.risk_scoring import build_zone_risk_profile

load_dotenv()


def generate_site_report(zone: dict, window_days: int = 7, profile_days: int = 3) -> dict:
    """
    Builds the full picture for one site:
      - exceedance + persistence over the last `window_days`
      - safest time of day, based on the last `profile_days`
      - why_hot: land-cover breakdown explaining the heat

    `zone` just needs id, name, worker_type, lat, lon — works equally for a
    freshly pinned map location or one of the pre-loaded demo zones.

    All underlying calls go through the cache (schema_cache.py), so calling
    this repeatedly for the same zone/window costs nothing after the first run.
    """
    client = FortyGuardClient()
    threshold_c = load_osha_threshold_celsius("high")

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=window_days - 1)
    window_hours = window_days * 24

    risk = build_zone_risk_profile(
        client=client, zone=zone, threshold_c=threshold_c,
        start_date=start.isoformat(), end_date=end.isoformat(),
        window_hours=window_hours,
    )

    profile_dates = [(end - timedelta(days=i)).isoformat() for i in range(profile_days)]
    time_profile = build_daily_time_profile(client, zone, profile_dates)
    ranked_blocks = recommend_safest_time(time_profile)

    safest_block = None
    if ranked_blocks:
        block_id, label, temp = ranked_blocks[0]
        safest_block = {"block_id": block_id, "label": label, "avg_temp_c": temp}

    # Land cover is a nice-to-have explanation layer, not core risk data —
    # if satellite coverage is missing for a pinned coordinate, the report
    # should still return with exceedance/persistence/safest-time intact.
    why_hot = None
    try:
        why_hot = get_zone_landcover_summary(client, zone, end.isoformat())
    except Exception as exc:
        print(f"  [warn] land cover unavailable for {zone['id']}: {exc}")

    return {
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "worker_type": zone["worker_type"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "risk_window": {
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "window_days": window_days,
        },
        "threshold_c": threshold_c,
        "exceedance": risk["exceedance"],
        "persistence": risk["persistence"],
        "pct_time_in_danger": risk["pct_time_in_danger"],
        "risk_label": risk["risk_label"],
        # True when FortyGuard had no tiles for this spot at any AOI radius.
        # The hour figures and pct_time_in_danger are null in that case —
        # "unmeasured", NOT "safe". Consumers must not render zeros.
        "no_coverage": risk["no_coverage"],
        # Which AOI box the numbers actually describe. `widened` means the
        # default ~330m box was empty and a larger one was used instead.
        "aoi": risk["aoi"],
        "time_of_day": {
            "profile_dates": profile_dates,
            "ranked_blocks": [
                {"block_id": bid, "label": label, "avg_temp_c": temp}
                for bid, label, temp in ranked_blocks
            ],
            "safest_block": safest_block,
        },
        "why_hot": why_hot,
    }


def generate_site_report_by_id(zone_id: str, window_days: int = 7, profile_days: int = 3) -> dict:
    """Convenience wrapper for the pre-loaded demo zones in config/zones.json."""
    zone = load_zone(zone_id)
    return generate_site_report(zone, window_days=window_days, profile_days=profile_days)


if __name__ == "__main__":
    report = generate_site_report_by_id("construction_downtown")
    print("\n=== Site Report ===")
    print(json.dumps(report, indent=2))