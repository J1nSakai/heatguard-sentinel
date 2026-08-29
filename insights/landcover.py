"""
insights/landcover.py
Person B — Day 6: use satellite_segmentation to explain WHY a zone is hot,
not just that it is. Turns "43 hours in danger" into "43 hours in danger,
and here's why: 78% pavement/buildings, almost no shade."

Land cover doesn't change hour-to-hour, so this always uses filter_type=3
(single day, full 24h) — no start_time needed, and the result is stable
regardless of what time of day you happen to ask.
"""

from datetime import date, timedelta

from dotenv import load_dotenv
from fortyguard import FortyGuardClient

from insights.historical import load_zone
from insights.schema_cache import get_or_fetch

load_dotenv()

# Keyword-bucketing per the quickstart notebook's own approach — absorbs
# label variations like "road, route" or "sidewalk, pavement" without
# needing an exact match on the raw class name.
IMPERVIOUS_KEYWORDS = ["building", "road", "route", "sidewalk", "pavement", "earth", "ground"]
VEGETATION_KEYWORDS = ["tree", "plant", "grass"]


# Verified against a real response (2026-08-25, construction_downtown):
# result -> {coordinates, original_image, orignal_image, image_year, segmentation}
# segmentation -> {request_id, processing_time_seconds, image_dimensions,
#                  mode, segments, image_legend, image_content}
# Both the correct and typo'd image keys are present and identical. They're
# base64 PNGs (~230KB each) we never use, so they get dropped before caching —
# otherwise every cache file is ~466KB instead of ~1KB.
_DROP_KEYS = ("original_image", "orignal_image")


def _strip_images(response: dict) -> dict:
    """Drop the unused base64 image blobs so the cache stays small/inspectable."""
    result = {k: v for k, v in response.get("result", {}).items() if k not in _DROP_KEYS}
    segmentation = result.get("segmentation")
    if isinstance(segmentation, dict):
        result["segmentation"] = {
            k: v for k, v in segmentation.items() if k not in ("image_content", "image_legend")
        }
    return {**response, "result": result}


def get_zone_landcover(client: FortyGuardClient, zone: dict, date_str: str, granularity: int = 80) -> dict:
    """Pull satellite segmentation for one zone, via the cache."""
    def _fetch():
        response = client.satellite_segmentation(
            latitude=zone["lat"],
            longitude=zone["lon"],
            start_date=date_str,
            filter_type=3,  # single day, full 24h — composition doesn't change hourly
            granularity=granularity,
        )
        return _strip_images(response)

    # Reusing the shared cache — analytic_type repurposed to mark this as a
    # landcover call, threshold_c unused (filler 0.0), same pattern as the
    # tcm time-block calls in recommender.py.
    return get_or_fetch(
        zone_id=zone["id"], analytic_type="landcover", threshold_c=0.0,
        start_date=date_str, end_date=date_str, granularity=granularity,
        fetch_fn=_fetch,
    )


def bucket_landcover(segments: dict) -> dict:
    """
    Groups raw class->percent segments into three buckets:
      - impervious: buildings, roads, pavement, bare ground (heat-retaining)
      - vegetation: trees, plants, grass (shade/cooling)
      - other: uncategorized
    """
    impervious_pct = 0.0
    vegetation_pct = 0.0
    other_pct = 0.0

    for cls, pct in segments.items():
        cls_lower = cls.lower()
        if any(kw in cls_lower for kw in IMPERVIOUS_KEYWORDS):
            impervious_pct += pct
        elif any(kw in cls_lower for kw in VEGETATION_KEYWORDS):
            vegetation_pct += pct
        else:
            other_pct += pct

    return {
        "impervious_pct": round(impervious_pct, 1),
        "vegetation_pct": round(vegetation_pct, 1),
        "other_pct": round(other_pct, 1),
    }


# Above this share of unclassified land cover, the buckets aren't a usable
# basis for a conclusion — see explain_why_hot(). Observed for real on a
# pinned Phoenix point: {tree: 0.99, "earth, ground": 16.71, others: 82.3}.
UNCLASSIFIED_LIMIT_PCT = 50.0


def explain_why_hot(bucketed: dict) -> str:
    """Plain-English explanation, dumbest-version-first cutoffs.

    Refuses to draw a conclusion when most of the imagery didn't classify
    into either bucket. Previously a pin returning 82.3% "others" fell
    through to the low-impervious branch and claimed "meaningful vegetation
    (1.0%) ... helps moderate heat" — the opposite of the truth, stated
    confidently. A hedge is fine here; a wrong reassurance is not.
    """
    impervious = bucketed["impervious_pct"]
    vegetation = bucketed["vegetation_pct"]
    other = bucketed["other_pct"]

    if other >= UNCLASSIFIED_LIMIT_PCT:
        return (
            f"Land cover for this spot is mostly unclassified ({other}% of the "
            f"satellite image), so it can't reliably explain the heat here. "
            f"Of what was identified: {impervious}% heat-retaining surface "
            f"(pavement, buildings, bare ground) and {vegetation}% vegetation."
        )

    if impervious >= 60:
        return (
            f"This zone is dominated by pavement and buildings ({impervious}% impervious surface), "
            f"which retain and radiate heat, with minimal cooling vegetation ({vegetation}%)."
        )
    elif impervious >= 35:
        return (
            f"This zone has a moderate mix of hard surfaces ({impervious}% impervious) "
            f"and vegetation ({vegetation}%), likely giving it some pockets of relief."
        )
    elif vegetation >= 15:
        return (
            f"This zone has relatively low impervious coverage ({impervious}%) "
            f"and meaningful vegetation ({vegetation}%), which likely helps moderate heat."
        )
    else:
        # Low impervious AND low vegetation — mostly bare//open ground. Not
        # shaded, so don't imply relief.
        return (
            f"This zone has little hard surface ({impervious}% impervious) but also "
            f"little vegetation ({vegetation}%), so there is minimal shade to "
            f"moderate direct sun exposure."
        )


def get_zone_landcover_summary(client: FortyGuardClient, zone: dict, date_str: str) -> dict:
    """One call, returns everything site_report.py needs."""
    response = get_zone_landcover(client, zone, date_str)
    result = response["result"]
    segments = result["segmentation"]["segments"]
    bucketed = bucket_landcover(segments)

    # If nothing matched a keyword, everything silently lands in other_pct.
    # explain_why_hot() now hedges instead of drawing a wrong conclusion,
    # but still log it so the keyword lists can be improved.
    if bucketed["other_pct"] >= UNCLASSIFIED_LIMIT_PCT:
        unmatched = sorted(segments, key=segments.get, reverse=True)[:5]
        print(f"  [warn] {bucketed['other_pct']}% of land cover matched no keyword bucket. "
              f"Top classes: {unmatched}. Check IMPERVIOUS_KEYWORDS/VEGETATION_KEYWORDS.")

    return {
        "image_year": result.get("image_year"),
        "raw_segments": segments,
        **bucketed,
        "unclassified_dominant": bucketed["other_pct"] >= UNCLASSIFIED_LIMIT_PCT,
        "explanation": explain_why_hot(bucketed),
    }


if __name__ == "__main__":
    client = FortyGuardClient()
    zone = load_zone("construction_downtown")
    date_str = (date.today() - timedelta(days=1)).isoformat()

    summary = get_zone_landcover_summary(client, zone, date_str)

    print(f"\n=== Land cover — {zone['name']} ===")
    print(f"Imagery year: {summary['image_year']}")
    print("\nRaw segments:")
    for cls, pct in sorted(summary["raw_segments"].items(), key=lambda kv: kv[1], reverse=True):
        print(f"  {cls:>30}: {pct}%")
    print(f"\nBucketed: impervious {summary['impervious_pct']}% | vegetation {summary['vegetation_pct']}% | other {summary['other_pct']}%")
    print(f"\nExplanation: {summary['explanation']}")