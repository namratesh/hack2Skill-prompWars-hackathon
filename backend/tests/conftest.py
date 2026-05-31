import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture(scope="session")
def client():
    return TestClient(app)


@pytest.fixture
def base_trip():
    return {
        "destination": "Tokyo, Japan",
        "start_date": "2026-09-01",
        "end_date": "2026-09-05",
        "budget_usd": 2000.0,
        "travel_style": ["culture", "food"],
        "group_type": "couple",
        "group_size": 2,
        "dietary_restrictions": [],
        "pace": "moderate",
        "must_visit": "",
        "accommodation_type": "mid-range",
        "special_occasion": "none",
        "notes": "",
    }


@pytest.fixture
def created_trip_id(client, base_trip):
    r = client.post("/api/trips", json=base_trip)
    assert r.status_code == 200
    return r.json()["trip_id"]
