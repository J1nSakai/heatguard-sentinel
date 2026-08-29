"""
shared/schema.py

Documents the shape of data flowing between Person A (agent), Person B
(insights + API), and Person C (frontend). Not enforced at runtime (no
validation library used, to keep it simple) — this is the reference
contract everyone builds against.

Every shape below was read off the actual code / a real API response, not
drafted from a plan. Where a field is unverified it says so explicitly.

=============================================================================
SHARED VOCABULARY — risk levels
=============================================================================
One vocabulary, defined once in config/osha_thresholds.json, used by both
Person A's live classifier and Person B's threshold lookup:

    level        risk_label          heat_index_c range
    ----------   -----------------   ------------------
    lower        Caution             26.7 - 32.2
    moderate     Extreme Caution     32.2 - 39.4
    high         Danger              39.4 - 46.1
    very_high    Extreme Danger      46.1+

NOTE: an earlier draft of this file used low/moderate/high/extreme. That
vocabulary is dead — nothing reads it. The only place it survives is
config/zones.json, which is a legacy file no code loads (see bottom).

=============================================================================
PERSON A — agent/
=============================================================================

--- Decision object (agent/escalation.py -> evaluate_site()) ---
{
    "zone_id": str,                  # e.g. "construction_downtown"
    "zone_name": str,                # e.g. "Downtown Phoenix Construction Corridor"
    "timestamp": str,                # ISO, machine-local, e.g. "2026-08-23T06:44:39.879986"
    "apparent_temperature_c": float, # current reading driving the decision
    "risk_level": str,               # "lower" | "moderate" | "high" | "very_high"
    "risk_label": str,               # "Caution" | "Extreme Caution" | "Danger" | "Extreme Danger"
    "guidance": str,                 # OSHA guidance text for that tier
    "action": str,                   # "log_only" (tier == lower) | "alert" (anything above)
    "simulated": bool,               # True when run with --simulate (demo safety net)

    # Only present when action == "alert":
    "explanation": str,              # LLM-phrased plain-English message (Groq),
                                     # falls back to a template if the LLM call fails

    # Only present when include_historical=True and simulate=False.
    # These numbers come from Person B's cached functions — NOT recomputed
    # independently, so A and B always show the same figures.
    "historical_context": {
        "exceedance":  <stats summary, see Person B section>,
        "persistence": <stats summary, see Person B section>,
        "threshold_c": float,        # 39.4 (OSHA "high"/Danger tier)
    },
}

--- Current conditions (agent/monitor.py -> get_current_conditions()) ---
Internal to Person A; escalation.py consumes it, nobody else needs to.
{
    "zone_id": str,
    "zone_name": str,
    "apparent_temperature_c": float,  # NOT heat_index_celsius — that field has a
                                      # known API quirk (peaks ~2am)
    "relative_humidity_pct": float,
    "aqi": float | None,
    "raw_activity_id": str,
    "request_date": str,              # Phoenix-local date (UTC-7, no DST)
    "request_time": str,              # rounded DOWN to the hour; the API returns
                                      # empty arrays for minute-level times
}

--- Alert log entry (agent/notifier.py -> data/logs/alerts.jsonl) ---
Exactly the decision object above, one JSON object per line (JSONL).
Person B's GET /zones/{zone_id}/alerts reads this file and filters on
`zone_id`, so that field must keep being written for the endpoint to work.
GET /alerts serves the same file unfiltered, newest first, for the
frontend's Alerts tab.

--- Alert subscription (agent/subscriptions.py -> data/subscriptions.json) ---
OPTIONAL feature: a manager who pinned a spot can ask to be emailed when
that coordinate's LIVE tier reaches their threshold. Storage is one JSON
file (gitignored), no database.
{
    "id": str,             # 12-hex, e.g. "6e5e2b892a07"
    "lat": float, "lon": float,
    "name": str,           # user's label, e.g. "North lot excavation"
    "worker_type": str,
    "email": str,
    "min_tier": str,       # "lower" | "moderate" | "high" | "very_high"
                           # Alert fires when the live tier is at or ABOVE
                           # this. Default "moderate" — "lower" would email
                           # on merely warm days and train people to ignore
                           # the alerts.
    "created_at": str,     # ISO 8601 UTC
    "last_checked_at": str | None,
    "last_alert_at": str | None,
}
Same email + same coordinate is treated as an UPDATE, not a second
subscription (double-clicking the button shouldn't double the emails).

Evaluation reuses Person A's classifier via
agent/escalation.py -> evaluate_pinned_zone(), which differs from
evaluate_site() only in taking a zone DICT (a pinned point isn't in
multi_zones.json), honouring `min_tier`, and routing the email to the
subscriber instead of the global ALERT_EMAIL_TO. Subscription checks skip
historical context by default — that's the expensive part, and the alert
only needs the current reading.

The polling pass is agent/run_subscriptions.py (one pass then exit, meant
for cron / Task Scheduler — no daemon to babysit during the demo).

=============================================================================
PERSON B — insights/ (served by api/)
=============================================================================

--- Stats summary (insights/historical.py -> summarize_stats()) ---
Shared by exceedance and persistence — same shape for both.
{
    "units": str,        # "hour"
    "n_cells": int,      # tiles in the AOI, e.g. 16 (0 when unmeasured)
    "min_hours": float | None,
    "max_hours": float | None,
    "mean_hours": float | None,
    "no_coverage": bool, # True when the API returned no tiles at all
}
Identical min/max/mean is normal, not a bug — verified for dense uniform
urban blocks via extreme-threshold tests and per-tile inspection.

COVERAGE GAPS — important. FortyGuard's heat tiles are patchy: a pinned
coordinate can return n_cells=0 while a point ~2km away has 16 cells
(observed for real: 33.4376,-112.0457 empty vs 33.4484,-112.074 full). In
that degraded case stats_data is just {"activity_id": ..., "n_cells": 0}
with NO units/min/max/mean, and map_data.features is empty.

Two deliberate responses to that:

1. AOI WIDENING (insights/historical.py AOI_LADDER_DEG). On a miss, the
   same point is retried with a bigger box: ~330m -> ~1000m -> ~3000m.
   Most "empty" pins resolve at a wider radius, so the user still gets a
   real answer about their site. The radius actually used is reported in
   the site report's `aoi` field. Each radius caches separately; the
   default radius keeps its bare cache key so pre-existing cache files
   still hit.

2. HONEST NULLS. If every radius is empty, the hour fields are None and
   no_coverage is True. They are NOT zeroed. Zero would render as "0% time
   in danger" / "Lower Risk Pattern" — i.e. telling a site manager that an
   unmeasured site is safe. Every consumer must treat None as UNKNOWN.

Exceedance = total hours above threshold across the window.
Persistence = longest UNBROKEN stretch above threshold. Both matter: 52
scattered hours is a different problem than 52 continuous ones.

--- Site report (insights/site_report.py -> generate_site_report()) ---
THE MAIN DELIVERABLE. Returned verbatim by GET /zones/{id}/report and
POST /zones/report. Real example values shown.
{
    "zone_id": str,               # "construction_downtown", or
                                  # "pinned_33.4484_-112.074" for a map pin
    "zone_name": str,
    "worker_type": str,           # "construction" | "warehouse_logistics" |
                                  # "agriculture_landscaping" | "unspecified"
    "generated_at": str,          # ISO 8601, UTC, tz-aware
    "risk_window": {
        "start_date": str,        # "2026-08-19"
        "end_date": str,          # "2026-08-25" (always yesterday — the
                                  # heatmap endpoint has NO forecast support)
        "window_days": int,       # 7
    },
    "threshold_c": float,         # 39.4
    "exceedance":  <stats summary>,   # e.g. mean_hours 52.0
    "persistence": <stats summary>,   # e.g. mean_hours 8.0
    "pct_time_in_danger": float | None,  # exceedance.mean_hours /
                                  # (window_days*24) * 100. None when
                                  # no_coverage — do NOT render as 0%.
    "risk_label": str,            # "Consistently High Risk" (>=30%)
                                  # "Moderate Risk Pattern"  (>=12%)
                                  # "Lower Risk Pattern"     (<12%)
                                  # "No Data For This Location" (no_coverage)
                                  # NOTE: distinct from the OSHA risk_label
                                  # above — this describes a WEEK-LONG
                                  # PATTERN, not a current tier. Different
                                  # question, deliberately different words.
    "no_coverage": bool,          # True -> the site is UNASSESSED, not safe.
                                  # Frontend shows a neutral grey banner and
                                  # tells the user to try a nearby pin.
    "aoi": {                      # which area the numbers actually describe
        "box_metres": int,        # 330 | 1000 | 3000
        "widened": bool,          # True -> the exact pin had no tiles, so a
                                  # larger box was used. Surface this, since
                                  # the figures are then an area average.
    },
    "time_of_day": {
        "profile_dates": [str],   # the individual days averaged together
        "ranked_blocks": [        # COOLEST FIRST — [0] is the recommendation
            {"block_id": str, "label": str, "avg_temp_c": float},
            ...                   # 5 blocks: early_morning "5am - 8am",
                                  # morning "8am - 11am", midday "11am - 2pm",
                                  # afternoon "2pm - 5pm", evening "5pm - 7pm"
        ],
        "safest_block": {"block_id": str, "label": str, "avg_temp_c": float} | None,
    },
    "why_hot": {                  # null if satellite coverage is unavailable —
                                  # explanation layer only, never blocks a report
        "image_year": int,        # 2026
        "raw_segments": {str: float},  # class -> percent, straight from the API,
                                       # e.g. {"building": 71.15,
                                       #       "road, route": 16.07,
                                       #       "sidewalk, pavement": 10.49}
        "impervious_pct": float,  # buildings/roads/pavement/bare ground
        "vegetation_pct": float,  # trees/plants/grass
        "other_pct": float,       # matched no keyword bucket
        "unclassified_dominant": bool,  # other_pct >= 50 -> the buckets can't
                                  # support a conclusion; `explanation` hedges
                                  # instead of guessing (a pin returning
                                  # 82.3% "others" previously claimed
                                  # "meaningful vegetation (1.0%) ... helps
                                  # moderate heat", which was flatly wrong)
        "explanation": str,       # plain-English, e.g. "This zone is dominated
                                  # by pavement and buildings (97.7% impervious
                                  # surface), which retain and radiate heat..."
    },
}

IMPORTANT for Person C: time_of_day.ranked_blocks is sorted coolest-first,
so ranked_blocks[0] == safest_block. Don't re-sort it. avg_temp_c can be
null for an individual block if that block returned no tiles; safest_block
is null only if EVERY block came back empty.

--- Zone risk profile (insights/risk_scoring.py -> build_zone_risk_profile()) ---
Intermediate shape; site_report.py flattens the useful parts into the report
above. Also used by the OPTIONAL cross-zone comparison. Adds `window`
(with window_hours) and `worker_type` around the same exceedance /
persistence / pct_time_in_danger / risk_label fields.

=============================================================================
PERSON B — api/ endpoints
=============================================================================
GET  /zones                     -> {"zones": [<zone config>, ...]}
GET  /zones/{zone_id}/report    -> <site report>   404 if zone_id unknown
     ?window_days=7&profile_days=3
POST /zones/report              -> <site report>   the real "click the map" path
     body: {"lat": float, "lon": float,            (api/models/pinned_location.py)
            "name": str = "Pinned Site",
            "worker_type": str = "unspecified",
            "window_days": int = 7,
            "profile_days": int = 3}
GET  /zones/{zone_id}/alerts    -> {"zone_id": str, "alerts": [<decision object>, ...]}
     ?limit=50                     Person A's log. Returns [] until alerts.jsonl
                                   exists. Newest `limit` entries.

--- Alerts + optional subscriptions (api/routes/alerts.py) ---
GET    /alerts                        -> {"alerts": [<decision object>, ...], "count": int}
       ?limit=50&zone_id=...             Newest first. [] until the agent alerts.
GET    /alerts/subscriptions           -> {"subscriptions": [<subscription>, ...]}
POST   /alerts/subscriptions           -> <subscription>   201
       body: {"lat": float, "lon": float, "email": str,
              "name": str = "Pinned Site",
              "worker_type": str = "unspecified",
              "min_tier": str = "moderate"}
       422 on a malformed email or an unknown min_tier.
DELETE /alerts/subscriptions/{id}      -> {"deleted": id}   404 if unknown
POST   /alerts/subscriptions/{id}/check -> <decision object>  404 if unknown
       ?simulate=true&simulate_temp_c=42
       Evaluates ONE subscription immediately and emails if the tier is met.
       Powers the UI's "Test" button and makes the alert path demonstrable
       without waiting for the scheduled pass. `simulate=true` skips the live
       API call (demo safety net), and marks the logged entry simulated: true.

Subscriptions are storage only — the endpoint does not start a poller.
agent/run_subscriptions.py is the scheduled pass that actually sends mail.

/report (B's computed historical analysis) and /alerts (A's log of past
events) are deliberately separate endpoints — two different kinds of data.

First call for an uncached zone/window takes ~2-4 minutes: roughly 17
FortyGuard tasks (exceedance + persistence + 5 blocks x 3 days + landcover),
each polled to completion. Repeat calls are near-instant off the cache.
Person C: show a spinner, and don't set a short client-side timeout.

--- Error responses on the two /report endpoints ---
All non-200s return FastAPI's standard {"detail": str} — safe to display.
    404 -> unknown zone_id (GET only)
    422 -> bad request body, e.g. missing lat/lon (POST only)
    503 -> FortyGuard unreachable, or its analysis timed out.
           TRANSIENT — retry is worth offering. Any work already finished is
           cached, so a retry resumes rather than starting over.
    502 -> FortyGuard returned a real error (bad key, task failed).
           Retrying is unlikely to help.
Person C: 503 should surface a "retry" affordance; 502 should not.

Note that a pinned coordinate gets zone_id "pinned_<lat>_<lon>", which is a
DIFFERENT cache key than a demo zone at the identical coordinate — pinning
the same spot as a demo zone still costs a full cold run.

=============================================================================
CONFIG
=============================================================================
--- config/multi_zones.json — the live zone config ---
{"note": str, "zones": [{
    "id": str, "name": str, "worker_type": str,
    "description": str, "lat": float, "lon": float, "address_hint": str,
}]}
NO stored polygon. The AOI is computed fresh per request by
build_zone_polygon() (~300m box around the point). This is required by the
map-pinning flow: an arbitrary pinned coordinate has no pre-stored polygon,
so storing one for the demo zones would mean two different code paths.

--- config/osha_thresholds.json — the tier table ---
{"source_note": str, "tiers": [{
    "level": str, "risk_label": str,
    "heat_index_f_min": float, "heat_index_f_max": float | None,
    "heat_index_c_min": float, "heat_index_c_max": float | None,
    "guidance": str,
}]}
Read by both agent/escalation.py (classify current temp) and
insights/historical.py (look up the "high" threshold). Single source of
truth for the risk vocabulary — change it here, both sides follow.

--- config/zones.json — LEGACY, DEAD ---
Single-zone file with a stored polygon_aoi and the old
low/moderate/high/extreme tiers. Nothing imports it. Superseded by
multi_zones.json + osha_thresholds.json. Safe to delete; kept only to avoid
churn mid-hackathon.
"""
