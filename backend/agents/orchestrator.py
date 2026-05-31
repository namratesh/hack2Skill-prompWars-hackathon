"""Orchestrator: coordinates LLM planning, weather enrichment, and replanning."""
import asyncio
import json
from typing import AsyncGenerator

from models.schemas import TripCreateRequest, ReplanRequest
from services.openrouter import call_llm, stream_llm
from services.weather_service import get_forecast
from prompts.planner_prompt import (
    PLANNER_SYSTEM, PLANNER_USER_TEMPLATE,
    REPLAN_SYSTEM, REPLAN_USER_TEMPLATE,
)


def _build_planner_prompt(request: TripCreateRequest, num_days: int) -> str:
    """Build the user prompt for the planner from a trip request."""
    return PLANNER_USER_TEMPLATE.format(
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


def _enrich_with_weather(itinerary: dict, weather: list[dict]) -> dict:
    """Merge weather forecast data into each itinerary day in-place."""
    weather_map: dict[str, dict] = {w["date"]: w for w in weather}
    for day in itinerary.get("days", []):
        forecast = weather_map.get(day.get("date", ""), {})
        day["weather_condition"] = forecast.get("condition", "Unknown")
        day["weather_temp_c"] = forecast.get("temp_c")
        day["rain_probability"] = forecast.get("rain_probability")
    return itinerary


async def generate_itinerary(request: TripCreateRequest) -> dict:
    """Generate a full itinerary, fetching weather concurrently with LLM planning."""
    num_days = (request.end_date - request.start_date).days + 1
    user_prompt = _build_planner_prompt(request, num_days)

    # Run weather fetch and LLM call concurrently — saves ~1-2 seconds
    weather_task = get_forecast(request.destination, request.start_date, num_days)
    llm_task = call_llm(
        system_prompt=PLANNER_SYSTEM,
        user_prompt=user_prompt,
        model_key="planning",
        max_tokens=2500,
        json_mode=True,
    )
    weather, raw = await asyncio.gather(weather_task, llm_task)

    itinerary = json.loads(raw)
    return _enrich_with_weather(itinerary, weather)


async def stream_itinerary(request: TripCreateRequest) -> AsyncGenerator[str, None]:
    """Stream itinerary tokens from the LLM."""
    num_days = (request.end_date - request.start_date).days + 1
    user_prompt = _build_planner_prompt(request, num_days)

    async for chunk in stream_llm(
        system_prompt=PLANNER_SYSTEM,
        user_prompt=user_prompt,
        model_key="fast",
        max_tokens=2500,
    ):
        yield chunk


async def replan_itinerary(request: ReplanRequest) -> dict:
    """Replan only the disrupted days with minimal changes."""
    affected_days = [
        d for d in request.current_itinerary.get("days", [])
        if d.get("day_number") in request.affected_days
    ]

    unaffected_spend = sum(
        a.get("cost_usd", 0)
        for d in request.current_itinerary.get("days", [])
        if d.get("day_number") not in request.affected_days
        for a in d.get("activities", [])
    )
    budget_remaining = round(
        request.current_itinerary.get("total_estimated_cost", 0) - unaffected_spend, 2
    )

    user_prompt = REPLAN_USER_TEMPLATE.format(
        trigger=request.trigger,
        reason=request.reason,
        affected_days=", ".join(str(d) for d in request.affected_days),
        affected_itinerary_json=json.dumps(affected_days, indent=2),
        destination=request.current_itinerary.get("destination", ""),
        budget_remaining=budget_remaining,
        travel_style=request.current_itinerary.get("travel_style", "balanced"),
    )

    raw = await call_llm(
        system_prompt=REPLAN_SYSTEM,
        user_prompt=user_prompt,
        model_key="fast",
        max_tokens=1500,
        json_mode=True,
    )
    return json.loads(raw)
