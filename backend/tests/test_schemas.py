"""Tests for schema-level validation rules."""
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

BASE = {
    "destination": "Tokyo, Japan",
    "start_date": "2026-09-01",
    "end_date": "2026-09-05",
    "budget_usd": 2000.0,
    "travel_style": ["culture"],
    "group_type": "couple",
    "group_size": 2,
}


class TestDestinationValidation:
    def test_blank_destination_rejected(self):
        r = client.post("/api/trips", json={**BASE, "destination": "   "})
        assert r.status_code == 422

    def test_one_char_destination_rejected(self):
        r = client.post("/api/trips", json={**BASE, "destination": "A"})
        assert r.status_code == 422

    def test_destination_201_chars_rejected(self):
        r = client.post("/api/trips", json={**BASE, "destination": "A" * 201})
        assert r.status_code == 422

    def test_valid_destination_accepted(self):
        r = client.post("/api/trips", json={**BASE, "destination": "Paris, France"})
        assert r.status_code == 200


class TestDateValidation:
    def test_end_before_start_rejected(self):
        r = client.post("/api/trips", json={**BASE, "start_date": "2026-09-10", "end_date": "2026-09-05"})
        assert r.status_code == 422

    def test_same_day_accepted(self):
        r = client.post("/api/trips", json={**BASE, "start_date": "2026-09-01", "end_date": "2026-09-01"})
        assert r.status_code == 200

    def test_invalid_date_format_rejected(self):
        r = client.post("/api/trips", json={**BASE, "start_date": "not-a-date"})
        assert r.status_code == 422


class TestBudgetValidation:
    def test_negative_budget_rejected(self):
        assert client.post("/api/trips", json={**BASE, "budget_usd": -1}).status_code == 422

    def test_zero_budget_rejected(self):
        assert client.post("/api/trips", json={**BASE, "budget_usd": 0}).status_code == 422

    def test_budget_over_limit_rejected(self):
        assert client.post("/api/trips", json={**BASE, "budget_usd": 200_000}).status_code == 422

    def test_budget_at_limit_accepted(self):
        assert client.post("/api/trips", json={**BASE, "budget_usd": 100_000}).status_code == 200


class TestGroupValidation:
    def test_group_size_zero_rejected(self):
        assert client.post("/api/trips", json={**BASE, "group_size": 0}).status_code == 422

    def test_group_size_over_limit_rejected(self):
        assert client.post("/api/trips", json={**BASE, "group_size": 51}).status_code == 422

    def test_group_size_max_accepted(self):
        assert client.post("/api/trips", json={**BASE, "group_size": 50}).status_code == 200


class TestTravelStyleSanitisation:
    def test_invalid_styles_stripped(self):
        r = client.post("/api/trips", json={**BASE, "travel_style": ["culture", "invalid_style", "food"]})
        assert r.status_code == 200
        trip_id = r.json()["trip_id"]
        trip = client.get(f"/api/trips/{trip_id}").json()
        assert "invalid_style" not in trip["travel_style"]
        assert "culture" in trip["travel_style"]

    def test_all_invalid_styles_result_in_empty_list(self):
        r = client.post("/api/trips", json={**BASE, "travel_style": ["fake1", "fake2"]})
        assert r.status_code == 200
        trip_id = r.json()["trip_id"]
        trip = client.get(f"/api/trips/{trip_id}").json()
        assert trip["travel_style"] == []


class TestPreferenceFields:
    def test_preferences_stored_correctly(self):
        payload = {
            **BASE,
            "dietary_restrictions": ["vegetarian", "gluten-free"],
            "pace": "slow",
            "must_visit": "Senso-ji Temple",
            "accommodation_type": "luxury",
            "special_occasion": "honeymoon",
            "notes": "First time in Japan",
        }
        r = client.post("/api/trips", json=payload)
        assert r.status_code == 200
        trip_id = r.json()["trip_id"]
        trip = client.get(f"/api/trips/{trip_id}").json()
        assert trip["dietary_restrictions"] == ["vegetarian", "gluten-free"]
        assert trip["pace"] == "slow"
        assert trip["must_visit"] == "Senso-ji Temple"
        assert trip["accommodation_type"] == "luxury"
        assert trip["special_occasion"] == "honeymoon"

    def test_preferences_default_when_omitted(self):
        r = client.post("/api/trips", json=BASE)
        assert r.status_code == 200
        trip_id = r.json()["trip_id"]
        trip = client.get(f"/api/trips/{trip_id}").json()
        assert trip["pace"] == "moderate"
        assert trip["accommodation_type"] == "mid-range"
        assert trip["dietary_restrictions"] == []

    def test_notes_too_long_rejected(self):
        r = client.post("/api/trips", json={**BASE, "notes": "x" * 501})
        assert r.status_code == 422

    def test_must_visit_too_long_rejected(self):
        r = client.post("/api/trips", json={**BASE, "must_visit": "x" * 501})
        assert r.status_code == 422
