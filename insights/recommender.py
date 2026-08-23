"""
insights/recommender.py
Person B — Day 4: recommend the safest TIME to work at a zone, and the
safest ZONE among several.

Two different questions, two different approaches:

1. Safest ZONE — we already have this from Day 3's risk_scoring.py
   (pct_time_in_danger per zone). Just rank what we've already computed.

2. Safest TIME OF DAY — the API won't hand us a 24-hour breakdown for a
   multi-day window directly, so we build it ourselves: split the day into
   a few chunks (morning/midday/afternoon/etc), ask "what was the average
   temperature during this chunk" for a handful of recent individual days,
   then average those together into a typical day shape.

Run with:  python -m insights.recommender
"""

from datetime import date, timedelta
from statistics import mean

from dotenv import load_dotenv
from fortyguard import FortyGuardClient

from insights.historical import build_zone_polygon, load_all_zones, load_zone
from insights.risk_scoring import run_risk_scoring_for_all_zones
from insights.schema_cache import get_or_fetch

load_dotenv()

# Dumbest-version-first: a handful of chunks, not all 24 hours individually.
# Tune these once this is validated.
TIME_BLOCKS = [
    {"id": "early_morning", "label": "5am - 8am", "start_time": "05:00", "end_time": "08:00"},
    {"id": "morning", "label": "8am - 11am", "start_time": "08:00", "end_time": "11:00"},
    {"id": "midday", "label": "11am - 2pm", "start_time": "11:00", "end_time": "14:00"},
    {"id": "afternoon", "label": "2pm - 5pm", "start_time": "14:00", "end_time": "17:00"},
    {"id": "evening", "label": "5pm - 7pm", "start_time": "17:00", "end_time": "19:00"},
]


# ---------- Safest time of day ----------

def get_block_avg_temperature(client, zone: dict, date_str: str, block: dict, granularity: int = 60) -> float:
    """One block, one specific day. Returns the average tile temperature (°C)."""
    def _fetch():
        aoi = build_zone_polygon(zone["lat"], zone["lon"])
        return client.create_heatmap(
            polygon_aoi=aoi,
            start_date=date_str,
            start_time=block["start_time"],
            end_time=block["end_time"],
            filter_type=2,  # range of hours, single day
            granularity=granularity,
        )

    # Reusing the same cache as historical.py — analytic_type is repurposed
    # here to encode the time block, since tcm calls don't have one of
    # their own. threshold_c is unused for tcm, so we pass 0.0 as a filler.
    response = get_or_fetch(
        zone_id=zone["id"], analytic_type=f"tcm_{block['id']}", threshold_c=0.0,
        start_date=date_str, end_date=date_str, granularity=granularity,
        fetch_fn=_fetch,
    )

    features = response["result"]["map_data"]["features"]
    # NOTE: the quickstart notebook's docs claim filter_type=2 returns a
    # single 'temperature' field. In practice the real API returns
    # 'average_temperature' (plus min/max) even for filter_type=2 — same
    # field names documented for filter_type=3/4. Checking both, in case
    # this differs again for other filter_types/analytic_types.
    temps = [
        f["properties"].get("average_temperature", f["properties"].get("temperature"))
        for f in features
        if "average_temperature" in f["properties"] or "temperature" in f["properties"]
    ]
    return mean(temps) if temps else None


def build_daily_time_profile(client, zone: dict, dates: list, blocks: list = TIME_BLOCKS) -> dict:
    """
    For each block, average its temperature across all given dates.
    Returns {block_id: {"label": ..., "avg_temp_c": ...}}
    """
    profile = {}
    for block in blocks:
        daily_values = []
        for date_str in dates:
            temp = get_block_avg_temperature(client, zone, date_str, block)
            if temp is not None:
                daily_values.append(temp)
        profile[block["id"]] = {
            "label": block["label"],
            "avg_temp_c": round(mean(daily_values), 1) if daily_values else None,
        }
    return profile


def recommend_safest_time(profile: dict) -> list:
    """Sorted list of (block_id, label, avg_temp_c), coolest first."""
    ranked = [
        (block_id, data["label"], data["avg_temp_c"])
        for block_id, data in profile.items()
        if data["avg_temp_c"] is not None
    ]
    return sorted(ranked, key=lambda row: row[2])


# ---------- Safest zone (reuses Day 3 data, no new API calls) ----------

def recommend_safest_zone(risk_profiles: list) -> list:
    """Sorted list of zone risk profiles, safest (lowest % time in danger) first."""
    return sorted(risk_profiles, key=lambda p: p["pct_time_in_danger"])


if __name__ == "__main__":
    client = FortyGuardClient()

    # --- Safest time of day, for one zone ---
    zone = load_zone("construction_downtown")
    end = date.today() - timedelta(days=1)
    # Start small (3 days) to keep the first run fast — bump up once validated.
    dates = [(end - timedelta(days=i)).isoformat() for i in range(3)]

    print(f"Building daily time profile for {zone['name']} across {dates}...")
    profile = build_daily_time_profile(client, zone, dates)

    print("\n--- Safest time of day ---")
    for block_id, label, temp in recommend_safest_time(profile):
        print(f"{label:<15} avg {temp}°C")

    # --- BONUS / OPTIONAL — only if time permits ---
    # Core hackathon scope is single-site only (see above). Cross-zone
    # comparison is a stretch goal; safe to comment this block out entirely
    # if time runs short, no dependencies from the single-site path above.
    print("\nScoring all zones for cross-zone comparison...")
    risk_profiles = run_risk_scoring_for_all_zones()

    print("\n--- Safest zone to schedule this week ---")
    for p in recommend_safest_zone(risk_profiles):
        print(f"{p['zone_name']:<40} {p['pct_time_in_danger']}% time in danger  ({p['risk_label']})")