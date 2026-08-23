"""
insights/site_report.py
Person B — combines everything from historical.py, risk_scoring.py, and
recommender.py into one clean report per site. This is the shape
api/routes/zones.py should hand back for GET /zones/{id}/history.

Run with:  python -m insights.site_report
"""

import json
from datetime import date, datetime, timedelta, timezone

from dotenv import load_dotenv
from fortyguard_client.client import FortyGuardClient

from insights.historical import load_osha_threshold_celsius, load_zone
from insights.recommender import build_daily_time_profile, recommend_safest_time
from insights.risk_scoring import build_zone_risk_profile

load_dotenv()


def generate_site_report(zone_id: str, window_days: int = 7, profile_days: int = 3) -> dict:
    """
    Builds the full picture for one site:
      - exceedance + persistence over the last `window_days`
      - safest time of day, based on the last `profile_days`

    All underlying calls go through the cache (schema_cache.py), so calling
    this repeatedly for the same zone/window costs nothing after the first run.
    """
    client = FortyGuardClient()
    zone = load_zone(zone_id)
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
        "time_of_day": {
            "profile_dates": profile_dates,
            "ranked_blocks": [
                {"block_id": bid, "label": label, "avg_temp_c": temp}
                for bid, label, temp in ranked_blocks
            ],
            "safest_block": safest_block,
        },
    }


if __name__ == "__main__":
    report = generate_site_report("construction_downtown")
    print("\n=== Site Report ===")
    print(json.dumps(report, indent=2))