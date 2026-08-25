"""
api/main.py
FastAPI app serving HeatGuard Sentinel's backend.

Run with:  uvicorn api.main:app --reload
Then visit http://127.0.0.1:8000/docs for an interactive test UI —
useful for Person C to try endpoints before wiring up the real frontend.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import zones

app = FastAPI(title="HeatGuard Sentinel API")

# Allow the React dev server (likely localhost:3000 or 5173) to call this
# API directly. Fine to leave wide open for a hackathon; would tighten
# this before any real deployment.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(zones.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "HeatGuard Sentinel API"}