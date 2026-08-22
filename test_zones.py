from dotenv import load_dotenv
load_dotenv()
from fortyguard import FortyGuardClient

client = FortyGuardClient()

# apne teeno zones ke actual lat/lon daalo (jo zones.json mein hain)
zones = {
    "excavation": (33.4484, -112.0740),
    "roofing": (33.4490, -112.0745),
    "storage": (33.4478, -112.0738),
}

for name, (lat, lon) in zones.items():
    result = client.environmental_parameters(
        lat=lat, lon=lon,
        start_date="2026-08-20", start_time="14:00", filter_type=1
    )
    print(name, result)