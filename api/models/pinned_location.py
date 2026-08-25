from pydantic import BaseModel

class PinnedLocation(BaseModel):
    lat: float
    lon: float
    name: str = "Pinned Site"
    worker_type: str = "unspecified"
    window_days: int = 7
    profile_days: int = 3
