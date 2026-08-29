import re

from pydantic import BaseModel, Field, field_validator

# Deliberately not using pydantic's EmailStr: that pulls in the
# email-validator package, and a pragmatic shape check is enough here — the
# real confirmation that an address works is whether the alert email lands.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class SubscriptionCreate(BaseModel):
    """Body for POST /alerts/subscriptions — subscribe a pinned spot."""

    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    email: str
    name: str = "Pinned Site"
    worker_type: str = "unspecified"
    # "lower" | "moderate" | "high" | "very_high" — validated against
    # agent/subscriptions.TIER_ORDER in the route so the vocabulary stays
    # defined in exactly one place.
    min_tier: str = "moderate"

    @field_validator("email")
    @classmethod
    def _check_email(cls, v: str) -> str:
        v = v.strip()
        if not _EMAIL_RE.match(v):
            raise ValueError("Not a valid email address")
        return v
