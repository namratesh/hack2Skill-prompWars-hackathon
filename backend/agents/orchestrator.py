import json
from datetime import date, timedelta
from models.schemas import TripCreateRequest, ReplanRequest
from services.openrouter import call_llm, stream_llm
from services.weather_service import get_forecast
from prompts.planner_prompt import (
    PLANNER_SYSTEM, PLANNER_USER_TEMPLATE,
    REPLAN_SYSTEM, REPLAN_USER_TEMPLATE,
)


async def generate_itinerary(request: TripCreateRequest) -> dict:
    num_days = (request.end_date - request.start_date).days + 1

    weather = await get_forecast(request.destination, request.start_date, num_days)

    user_prompt = PLANNER_USER_TEMPLATE.format(
        destination=request.destination,
        start_date=request.start_date.isoformat(),
        end_date=request.end_date.isoformat(),
        num_days=num_days,
        budget_usd=request.budget_usd,
        travel_style=", ".join(request.travel_style) if request.travel_style else "balanced",
        group_type=request.group_type,
        group_size=request.group_size,
        pace=request.pace or "moderate",
        accommodation_type=request.accommodation_type or "mid-range",
        dietary_restrictions=", ".join(request.dietary_restrictions) if request.dietary_restrictions else "none",
        special_occasion=request.special_occasion or "none",
        must_visit=request.must_visit or "none specified",
        notes=request.notes or "none",
    )

    raw = await call_llm(
        system_prompt=PLANNER_SYSTEM,
        user_prompt=user_prompt,
        model_key="planning",
        max_tokens=5000,
        json_mode=True,
    )

    itinerary = json.loads(raw)

    weather_map = {w["date"]: w for w in weather}
    for day in itinerary.get("days", []):
        day_weather = weather_map.get(day.get("date", ""), {})
        day["weather_condition"] = day_weather.get("condition", "Unknown")
        day["weather_temp_c"] = day_weather.get("temp_c", None)
        day["rain_probability"] = day_weather.get("rain_probability", None)

    return itinerary


async def stream_itinerary(request: TripCreateRequest):
    num_days = (request.end_date - request.start_date).days + 1

    user_prompt = PLANNER_USER_TEMPLATE.format(
        destination=request.destination,
        start_date=request.start_date.isoformat(),
        end_date=request.end_date.isoformat(),
        num_days=num_days,
        budget_usd=request.budget_usd,
        travel_style=", ".join(request.travel_style) if request.travel_style else "balanced",
        group_type=request.group_type,
        group_size=request.group_size,
        pace=request.pace or "moderate",
        accommodation_type=request.accommodation_type or "mid-range",
        dietary_restrictions=", ".join(request.dietary_restrictions) if request.dietary_restrictions else "none",
        special_occasion=request.special_occasion or "none",
        must_visit=request.must_visit or "none specified",
        notes=request.notes or "none",
    )

    async for chunk in stream_llm(
        system_prompt=PLANNER_SYSTEM,
        user_prompt=user_prompt,
        model_key="fast",
        max_tokens=5000,
    ):
        yield chunk


async def replan_itinerary(request: ReplanRequest) -> dict:
    affected_days = [
        d for d in request.current_itinerary.get("days", [])
        if d.get("day_number") in request.affected_days
    ]

    total_spent = sum(
        a.get("cost_usd", 0)
        for d in request.current_itinerary.get("days", [])
        if d.get("day_number") not in request.affected_days
        for a in d.get("activities", [])
    )
    budget_remaining = request.current_itinerary.get("total_estimated_cost", 0) - total_spent

    user_prompt = REPLAN_USER_TEMPLATE.format(
        trigger=request.trigger,
        reason=request.reason,
        affected_days=", ".join(str(d) for d in request.affected_days),
        affected_itinerary_json=json.dumps(affected_days, indent=2),
        destination=request.current_itinerary.get("destination", ""),
        budget_remaining=round(budget_remaining, 2),
        travel_style=request.current_itinerary.get("travel_style", "balanced"),
    )

    raw = await call_llm(
        system_prompt=REPLAN_SYSTEM,
        user_prompt=user_prompt,
        model_key="fast",
        max_tokens=3000,
        json_mode=True,
    )

    return json.loads(raw)
