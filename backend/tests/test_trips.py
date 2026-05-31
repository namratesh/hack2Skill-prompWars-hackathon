"""
Tests for the trip planning API endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

VALID_TRIP = {
    "destination": "Tokyo, Japan",
    "start_date": "2026-08-01",
    "end_date": "2026-08-07",
    "budget_usd": 2000.0,
    "travel_style": ["culture", "food"],
    "group_type": "couple",
    "group_size": 2,
}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_ok(self):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert "service" in body

    def test_health_has_correct_content_type(self):
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]


# ---------------------------------------------------------------------------
# Create trip
# ---------------------------------------------------------------------------

class TestCreateTrip:
    def test_create_trip_returns_trip_id(self):
        response = client.post("/api/trips", json=VALID_TRIP)
        assert response.status_code == 200
        body = response.json()
        assert "trip_id" in body
        assert len(body["trip_id"]) > 0
        assert body["status"] == "created"

    def test_each_trip_gets_unique_id(self):
        r1 = client.post("/api/trips", json=VALID_TRIP)
        r2 = client.post("/api/trips", json=VALID_TRIP)
        assert r1.json()["trip_id"] != r2.json()["trip_id"]

    def test_missing_destination_fails_validation(self):
        payload = {**VALID_TRIP}
        del payload["destination"]
        response = client.post("/api/trips", json=payload)
        assert response.status_code == 422

    def test_missing_start_date_fails_validation(self):
        payload = {**VALID_TRIP}
        del payload["start_date"]
        response = client.post("/api/trips", json=payload)
        assert response.status_code == 422

    def test_missing_end_date_fails_validation(self):
        payload = {**VALID_TRIP}
        del payload["end_date"]
        response = client.post("/api/trips", json=payload)
        assert response.status_code == 422

    def test_invalid_budget_rejected(self):
        response = client.post("/api/trips", json={**VALID_TRIP, "budget_usd": -500})
        assert response.status_code == 422

    def test_zero_budget_rejected(self):
        response = client.post("/api/trips", json={**VALID_TRIP, "budget_usd": 0})
        assert response.status_code == 422

    def test_empty_body_fails_validation(self):
        response = client.post("/api/trips", json={})
        assert response.status_code == 422

    def test_solo_group_type_accepted(self):
        payload = {**VALID_TRIP, "group_type": "solo", "group_size": 1}
        response = client.post("/api/trips", json=payload)
        assert response.status_code == 200

    def test_empty_travel_style_accepted(self):
        response = client.post("/api/trips", json={**VALID_TRIP, "travel_style": []})
        assert response.status_code == 200

    def test_destination_too_long_rejected(self):
        long_dest = "A" * 201
        response = client.post("/api/trips", json={**VALID_TRIP, "destination": long_dest})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Get trip
# ---------------------------------------------------------------------------

class TestGetTrip:
    def _create(self):
        return client.post("/api/trips", json=VALID_TRIP).json()["trip_id"]

    def test_get_created_trip(self):
        trip_id = self._create()
        response = client.get(f"/api/trips/{trip_id}")
        assert response.status_code == 200

    def test_get_trip_returns_correct_destination(self):
        trip_id = self._create()
        response = client.get(f"/api/trips/{trip_id}")
        assert response.json()["destination"] == VALID_TRIP["destination"]

    def test_get_trip_preserves_budget(self):
        trip_id = self._create()
        assert client.get(f"/api/trips/{trip_id}").json()["budget_usd"] == VALID_TRIP["budget_usd"]

    def test_get_trip_preserves_travel_style(self):
        trip_id = self._create()
        assert client.get(f"/api/trips/{trip_id}").json()["travel_style"] == VALID_TRIP["travel_style"]

    def test_get_nonexistent_trip_returns_404(self):
        response = client.get("/api/trips/nonexistent-id-xyz")
        assert response.status_code == 404

    def test_get_trip_status_is_created(self):
        trip_id = self._create()
        assert client.get(f"/api/trips/{trip_id}").json()["status"] == "created"

    def test_get_trip_itinerary_is_null_initially(self):
        trip_id = self._create()
        assert client.get(f"/api/trips/{trip_id}").json()["itinerary"] is None


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------

class TestAlerts:
    def _create(self):
        return client.post("/api/trips", json=VALID_TRIP).json()["trip_id"]

    def test_new_trip_has_no_alerts(self):
        trip_id = self._create()
        response = client.get(f"/api/trips/{trip_id}/alerts")
        assert response.status_code == 200
        assert response.json()["alerts"] == []

    def test_alerts_for_nonexistent_trip_returns_404(self):
        response = client.get("/api/trips/bad-id/alerts")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Replan
# ---------------------------------------------------------------------------

class TestReplan:
    def _create(self):
        return client.post("/api/trips", json=VALID_TRIP).json()["trip_id"]

    def test_replan_without_itinerary_returns_400(self):
        trip_id = self._create()
        response = client.post(f"/api/trips/{trip_id}/replan", json={
            "trigger": "weather",
            "reason": "Heavy rain expected",
            "affected_days": [1, 2],
            "current_itinerary": {},
        })
        assert response.status_code == 400

    def test_replan_nonexistent_trip_returns_404(self):
        response = client.post("/api/trips/nonexistent-xyz/replan", json={
            "trigger": "weather",
            "reason": "Rain",
            "affected_days": [1],
            "current_itinerary": {},
        })
        assert response.status_code == 404
