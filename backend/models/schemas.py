from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import date


class TripCreateRequest(BaseModel):
    destination: str = Field(..., min_length=2, max_length=200)
    start_date: date
    end_date: date
    budget_usd: float = Field(..., gt=0, le=100_000)
    travel_style: list[str] = Field(default_factory=list)
    group_type: str = Field(default="solo", max_length=50)
    group_size: int = Field(default=1, ge=1, le=50)
    # User preference enrichment
    dietary_restrictions: list[str] = Field(default_factory=list)
    pace: str = Field(default="moderate", max_length=20)
    must_visit: str = Field(default="", max_length=500)
    accommodation_type: str = Field(default="mid-range", max_length=50)
    special_occasion: str = Field(default="none", max_length=100)
    notes: str = Field(default="", max_length=500)

    @field_validator("destination")
    @classmethod
    def destination_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Destination cannot be blank")
        return v.strip()

    @field_validator("end_date")
    @classmethod
    def end_after_start(cls, end: date, info) -> date:
        start = info.data.get("start_date")
        if start and end < start:
            raise ValueError("end_date must be on or after start_date")
        return end

    @field_validator("travel_style")
    @classmethod
    def sanitize_styles(cls, styles: list[str]) -> list[str]:
        allowed = {"culture", "food", "adventure", "relaxation", "nightlife", "nature", "shopping", "history"}
        return [s for s in styles if s in allowed]


class ReplanRequest(BaseModel):
    trigger: str = Field(..., max_length=50)
    reason: str = Field(..., max_length=500)
    affected_days: list[int] = Field(default_factory=list)
    current_itinerary: dict


class ActivityOut(BaseModel):
    id: Optional[str] = None
    sequence_order: int
    name: str
    type: str
    location_name: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    start_time: str
    duration_minutes: int
    cost_usd: float
    description: str
    insider_tip: Optional[str] = None
    status: str = "suggested"


class DayOut(BaseModel):
    day_number: int
    date: str
    theme: str
    ai_reasoning: str
    weather_condition: Optional[str] = None
    weather_temp_c: Optional[float] = None
    rain_probability: Optional[int] = None
    activities: list[ActivityOut] = Field(default_factory=list)


class TripOut(BaseModel):
    id: str
    destination: str
    start_date: str
    end_date: str
    budget_usd: float
    travel_style: list[str]
    group_type: str
    group_size: int
    status: str
    days: list[DayOut] = Field(default_factory=list)
    total_estimated_cost: float = 0.0


class AlertOut(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    body: str
    affected_day_numbers: list[int]
    resolved: bool
    created_at: str
