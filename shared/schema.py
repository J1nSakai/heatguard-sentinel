"""
shared/schema.py

Documents the shape of data flowing between Person A (agent), Person B
(insights), and Person C (frontend/API). Not enforced at runtime (no
validation library used, to keep it simple) — this is the reference
contract everyone builds against.

=== Decision object (from agent/escalation.py -> evaluate_site()) ===
{
    "timestamp": str,              # ISO format, e.g. "2026-08-23T06:44:39.879986"
    "exceedance_hours": float,     # hours site spent above threshold in period
    "persistence_hours": float,    # longest continuous stretch above threshold
    "threshold_c": float,          # e.g. 38.0
    "risk_tier": str,              # "low" | "moderate" | "high" | "extreme"
    "action": str,                 # "log_only" | "alert"
    "recommended_response": str,   # only present if action == "alert"
}

=== Alert log entry (from agent/notifier.py, written to data/logs/alerts.jsonl) ===
Same shape as the decision object above, one JSON object per line (JSONL format).
Person C's API layer (api/routes/zones.py) should read this file and expose
it via GET /zones/{id}/history or similar.

=== Zone config (from config/zones.json) ===
{
    "site_name": str,
    "polygon_aoi": dict,            # GeoJSON FeatureCollection
    "heat_threshold_celsius": float,
    "osha_tiers": dict,              # tier name -> max_persistence_hours
    "granularity_m": int,
}

=== Still TBD / owned by Person B ===
- Historical "safest time" recommendation shape (insights/recommender.py)
- Land-cover / satellite_segmentation output shape (insights/landcover.py)
  Person B: please add your output shape here once defined, so Person C's
  frontend and the API layer can build against it too.
"""