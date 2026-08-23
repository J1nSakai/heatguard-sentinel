from dotenv import load_dotenv
load_dotenv()
from fortyguard import FortyGuardClient

client = FortyGuardClient()

# Polygon boundary covering all 3 zones + small buffer
# (coordinates in [longitude, latitude] order — GeoJSON standard, note the order!)
polygon_aoi = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [-112.0755, 33.4470],
                    [-112.0725, 33.4470],
                    [-112.0725, 33.4500],
                    [-112.0755, 33.4500],
                    [-112.0755, 33.4470],
                ]]
            }
        }
    ]
}

result = client.create_heatmap(
    polygon_aoi=polygon_aoi,
    start_date="2026-08-19",
    end_date="2026-08-20",
    filter_type=4,              # range of days
    granularity=60,
    analytic_type="exceedance",
    threshold=38.0,             # °C — OSHA-relevant high-risk threshold, adjust based on research
    direction="above",
)
print(result)