from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class TripCreateRequest(BaseModel):
    destination: str
    start_date: date
    end_date: date
    budget_usd: float
    travel_style: list[str] = Field(default_factory=list)
    group_type: str = "solo"
    group_size: int = 1


class ReplanRequest(BaseModel):
    trigger: str  # "weather" | "strike" | "closure" | "manual"
    reason: str
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
