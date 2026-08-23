"""
agent/monitor.py

Pulls site-level heat risk data for the construction site.
Config (polygon, threshold) now comes from config/zones.json — not hardcoded.

KEY DECISION (from testing on 2026-08-23):
- env_params, tcm, and exceedance heatmaps all returned FLAT values across
  the 3 planned zones (too close together for FortyGuard's grid to
  spatially differentiate).
- So: risk is tracked at SITE level, differentiated by TIME (exceedance/
  persistence across hours/days), not by zone/space.
- Zone-specific "why it's risky" comes from satellite_segmentation
  (land-cover: shade/asphalt %) in insights/landcover.py (Person B).
"""

import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv
from fortyguard import FortyGuardClient

load_dotenv()

client = FortyGuardClient()

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config", "zones.json")

with open(CONFIG_PATH) as f:
    _config = json.load(f)

SITE_POLYGON = _config["polygon_aoi"]
HEAT_THRESHOLD_C = _config["heat_threshold_celsius"]
GRANULARITY_M = _config.get("granularity_m", 60)


def get_current_exceedance(days_back: int = 1) -> dict:
    """Returns hours-above-threshold for the site over the last `days_back` days."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    result = client.create_heatmap(
        polygon_aoi=SITE_POLYGON,
        start_date=start_date,
        end_date=end_date,
        filter_type=4,
        granularity=GRANULARITY_M,
        analytic_type="exceedance",
        threshold=HEAT_THRESHOLD_C,
        direction="above",
    )

    stats = result["result"]["stats_data"]
    return {
        "site_exceedance_hours": stats["mean"],
        "threshold_c": HEAT_THRESHOLD_C,
        "period": {"start": start_date, "end": end_date},
        "raw_activity_id": result["activity_id"],
    }


def get_persistence(days_back: int = 1) -> dict:
    """Returns longest continuous stretch above threshold."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")

    result = client.create_heatmap(
        polygon_aoi=SITE_POLYGON,
        start_date=start_date,
        end_date=end_date,
        filter_type=4,
        granularity=GRANULARITY_M,
        analytic_type="persistence",
        threshold=HEAT_THRESHOLD_C,
        direction="above",
    )

    stats = result["result"]["stats_data"]
    return {
        "site_persistence_hours": stats["mean"],
        "threshold_c": HEAT_THRESHOLD_C,
        "period": {"start": start_date, "end": end_date},
        "raw_activity_id": result["activity_id"],
    }


def simulate_breach(persistence_hours: float = 7.0) -> dict:
    """
    DEMO SAFETY NET: returns a fake high-persistence reading so escalation
    can be demonstrated live even if real conditions aren't currently
    breaching threshold. Use this during the demo rehearsal / presentation,
    not as real data.
    """
    return {
        "site_persistence_hours": persistence_hours,
        "threshold_c": HEAT_THRESHOLD_C,
        "period": {"start": "SIMULATED", "end": "SIMULATED"},
        "raw_activity_id": "simulated",
    }


if __name__ == "__main__":
    print("Exceedance:", get_current_exceedance())
    print("Persistence:", get_persistence())