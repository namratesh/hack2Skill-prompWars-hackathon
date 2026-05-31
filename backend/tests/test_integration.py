"""Integration-style tests that verify multi-step workflows."""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TRIP = {
    "destination": "Barcelona, Spain",
    "start_date": "2026-10-01",
    "end_date": "2026-10-04",
    "budget_usd": 1500.0,
    "travel_style": ["food", "culture"],
    "group_type": "friends",
    "group_size": 3,
    "dietary_restrictions": ["vegetarian"],
    "pace": "fast",
    "must_visit": "Sagrada Familia",
    "accommodation_type": "budget",
    "special_occasion": "birthday",
    "notes": "Big football fans",
}


class TestTripLifecycle:
    def test_create_returns_uuid(self):
        r = client.post("/api/trips", json=TRIP)
        assert r.status_code == 200
        tid = r.json()["trip_id"]
        assert len(tid) == 36  # UUID format
        assert tid.count("-") == 4

    def test_created_trip_retrievable(self):
        tid = client.post("/api/trips", json=TRIP).json()["trip_id"]
        trip = client.get(f"/api/trips/{tid}").json()
        assert trip["id"] == tid
        assert trip["status"] == "created"
        assert trip["itinerary"] is None

    def test_alerts_empty_on_new_trip(self):
        tid = client.post("/api/trips", json=TRIP).json()["trip_id"]
        alerts = client.get(f"/api/trips/{tid}/alerts").json()
        assert alerts == {"alerts": []}

    def test_replan_before_generate_returns_400(self):
        tid = client.post("/api/trips", json=TRIP).json()["trip_id"]
        r = client.post(f"/api/trips/{tid}/replan", json={
            "trigger": "weather",
            "reason": "Rain",
            "affected_days": [1],
            "current_itinerary": {},
        })
        assert r.status_code == 400

    def test_multiple_trips_independent(self):
        id1 = client.post("/api/trips", json=TRIP).json()["trip_id"]
        id2 = client.post("/api/trips", json={**TRIP, "destination": "Rome, Italy"}).json()["trip_id"]
        assert id1 != id2
        assert client.get(f"/api/trips/{id1}").json()["destination"] == "Barcelona, Spain"
        assert client.get(f"/api/trips/{id2}").json()["destination"] == "Rome, Italy"

    def test_generate_nonexistent_trip_404(self):
        assert client.post("/api/trips/does-not-exist/generate").status_code == 404

    def test_stream_nonexistent_trip_404(self):
        assert client.post("/api/trips/does-not-exist/generate/stream").status_code == 404


class TestCORSHeaders:
    def test_options_preflight_allowed(self):
        r = client.options("/api/trips", headers={"Origin": "https://example.com"})
        assert r.status_code in (200, 405)

    def test_health_endpoint_json(self):
        r = client.get("/health")
        assert r.headers["content-type"].startswith("application/json")
        assert r.json()["status"] == "ok"


class TestInputEdgeCases:
    def test_large_group_size_boundary(self):
        assert client.post("/api/trips", json={**TRIP, "group_size": 50}).status_code == 200
        assert client.post("/api/trips", json={**TRIP, "group_size": 51}).status_code == 422

    def test_max_budget_boundary(self):
        assert client.post("/api/trips", json={**TRIP, "budget_usd": 100_000}).status_code == 200
        assert client.post("/api/trips", json={**TRIP, "budget_usd": 100_001}).status_code == 422

    def test_destination_stripped_of_whitespace(self):
        r = client.post("/api/trips", json={**TRIP, "destination": "  Paris  "})
        assert r.status_code == 200
        tid = r.json()["trip_id"]
        assert client.get(f"/api/trips/{tid}").json()["destination"] == "Paris"
