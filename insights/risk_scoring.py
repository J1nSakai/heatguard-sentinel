"""
insights/risk_scoring.py
Person B — Day 3: loop all zones, score each one's historical heat risk.

For each zone, over the same 7-day window:
  - exceedance: total hours spent above the OSHA "Danger" threshold (39.4°C)
  - persistence: the longest unbroken stretch above that threshold
Both matter for risk: 40 scattered hours across a week is a different problem
than 40 hours in one continuous 2-day heat event.

Run with:  python -m insights.risk_scoring
Logs results to data/logs/risk_scores_<date>.json (mirrors Person A's
JSON logging pattern for the live alert side).
"""

import json
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fortyguard import FortyGuardClient

from insights.historical import (
    AOI_LADDER_DEG,
    BUFFER_DEG,
    _deg_to_box_metres,
    get_zone_analytic_with_widening,
    load_all_zones,
    load_osha_threshold_celsius,
    summarize_stats,
)

load_dotenv()

REPO_ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = REPO_ROOT / "data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

WINDOW_DAYS = 7

# Used when the API has no tiles anywhere in the AOI ladder. Deliberately
# NOT one of the three risk tiers — "we couldn't measure this" is a
# different statement from "this is low risk", and must never render as
# a reassuring result.
NO_DATA_LABEL = "No Data For This Location"


def score_risk_label(pct_time_in_danger: float) -> str:
    """Dumbest-version-first cutoffs — tune these once you have more zones'
    worth of real data to compare against. Arbitrary but directionally sane."""
    if pct_time_in_danger >= 30:
        return "Consistently High Risk"
    elif pct_time_in_danger >= 12:
        return "Moderate Risk Pattern"
    else:
        return "Lower Risk Pattern"


def build_zone_risk_profile(
    client: FortyGuardClient,
    zone: dict,
    threshold_c: float,
    start_date: str,
    end_date: str,
    window_hours: int,
) -> dict:
    # Both calls widen the AOI on a coverage miss, so a pinned point that
    # falls in a tile gap still yields usable numbers from a larger box
    # around the same spot.
    exceedance_resp, exc_buffer = get_zone_analytic_with_widening(
        client=client, zone=zone, analytic_type="exceedance",
        start_date=start_date, end_date=end_date, threshold_c=threshold_c,
    )
    persistence_resp, per_buffer = get_zone_analytic_with_widening(
        client=client, zone=zone, analytic_type="persistence",
        start_date=start_date, end_date=end_date, threshold_c=threshold_c,
    )

    exceedance = summarize_stats(exceedance_resp)
    persistence = summarize_stats(persistence_resp)

    no_coverage = exceedance["no_coverage"]

    # mean_hours is None when unmeasured — do NOT coerce to 0, that would
    # report an unmeasured site as 0% time in danger.
    if no_coverage:
        pct_time_in_danger = None
        risk_label = NO_DATA_LABEL
    else:
        pct_time_in_danger = round((exceedance["mean_hours"] / window_hours) * 100, 1)
        risk_label = score_risk_label(pct_time_in_danger)

    # Widest radius actually used across the two calls, reported so the UI
    # can say "averaged over a ~900m area" when it wasn't the default box.
    used_buffer = max(exc_buffer, per_buffer)

    return {
        "zone_id": zone["id"],
        "zone_name": zone["name"],
        "worker_type": zone["worker_type"],
        "threshold_c": threshold_c,
        "window": {"start_date": start_date, "end_date": end_date, "window_hours": window_hours},
        "exceedance": exceedance,
        "persistence": persistence,
        "pct_time_in_danger": pct_time_in_danger,
        "risk_label": risk_label,
        "no_coverage": no_coverage,
        "aoi": {
            "box_metres": _deg_to_box_metres(used_buffer),
            "widened": used_buffer != BUFFER_DEG,
        },
    }


def run_risk_scoring_for_all_zones() -> list:
    client = FortyGuardClient()
    threshold_c = load_osha_threshold_celsius("high")

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=WINDOW_DAYS - 1)
    window_hours = WINDOW_DAYS * 24

    profiles = []
    for zone in load_all_zones():
        print(f"Scoring {zone['id']}...")
        profile = build_zone_risk_profile(
            client=client, zone=zone, threshold_c=threshold_c,
            start_date=start.isoformat(), end_date=end.isoformat(),
            window_hours=window_hours,
        )
        profiles.append(profile)

    return profiles


def log_profiles(profiles: list) -> Path:
    out_path = LOG_DIR / f"risk_scores_{date.today().isoformat()}.json"
    out_path.write_text(json.dumps(profiles, indent=2))
    return out_path


def print_summary_table(profiles: list) -> None:
    print("\n--- Zone Risk Summary ---")
    print(f"{'Zone':<35} {'Mean hrs/wk':<12} {'Longest run':<13} {'% time danger':<15} {'Risk label'}")
    for p in profiles:
        exc = p["exceedance"]["mean_hours"]
        per = p["persistence"]["mean_hours"]
        pct = p["pct_time_in_danger"]
        print(
            f"{p['zone_name']:<35} "
            f"{'n/a' if exc is None else exc:<12} "
            f"{'n/a' if per is None else per:<13} "
            f"{'n/a' if pct is None else pct:<15} "
            f"{p['risk_label']}"
        )


if __name__ == "__main__":
    profiles = run_risk_scoring_for_all_zones()
    print_summary_table(profiles)
    log_path = log_profiles(profiles)
    print(f"\nLogged to: {log_path}")