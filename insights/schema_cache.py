"""
insights/schema_cache.py
Caches historical exceedance/persistence results so we don't re-ask
FortyGuard the exact same question twice.

Why this is safe: every request we make is about PAST dates, and the past
doesn't change. "How many hours was Zone X above 39.4C last Tuesday" will
always have the same answer, no matter when we ask it. So once we've fetched
something, we can reuse it forever — no expiry needed, unlike a typical
cache for live/changing data.

Storage: one JSON file per cached "question", saved under data/cache/.
Simple and easy to inspect by hand while debugging.
"""

import hashlib
import json
from pathlib import Path
from typing import Optional

REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / "data" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def build_cache_key(
    zone_id: str,
    analytic_type: str,
    threshold_c: float,
    start_date: str,
    end_date: str,
    granularity: int,
) -> str:
    """
    Turns 'the same question' into a single stable filename.
    Two calls with identical zone/type/threshold/dates/granularity
    produce the exact same key, regardless of call order.
    """
    raw = f"{zone_id}|{analytic_type}|{threshold_c}|{start_date}|{end_date}|{granularity}"
    # Hash it so the filename stays short and filesystem-safe, no matter
    # how the inputs look.
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def read_cache(key: str) -> Optional[dict]:
    """Returns the cached summary dict, or None if we haven't asked this before."""
    path = _cache_path(key)
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write_cache(key: str, data: dict) -> None:
    _cache_path(key).write_text(json.dumps(data, indent=2))


def get_or_fetch(
    zone_id: str,
    analytic_type: str,
    threshold_c: float,
    start_date: str,
    end_date: str,
    granularity: int,
    fetch_fn,
) -> dict:
    """
    Check the cache first; only call fetch_fn() (the real API call) on a miss.

    fetch_fn should be a zero-argument callable that does the actual
    FortyGuard call + summarize_stats() and returns the summary dict —
    pass it in as a lambda so we only run it when we actually need to.
    """
    key = build_cache_key(zone_id, analytic_type, threshold_c, start_date, end_date, granularity)
    cached = read_cache(key)
    if cached is not None:
        print(f"  [cache hit] {zone_id} / {analytic_type} / {start_date}-{end_date}")
        return cached

    print(f"  [cache miss] {zone_id} / {analytic_type} / {start_date}-{end_date} — calling API")
    result = fetch_fn()
    write_cache(key, result)
    return result