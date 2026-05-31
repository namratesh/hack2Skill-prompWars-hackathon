from fastapi import APIRouter
from datetime import date
from services.weather_service import get_forecast

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("/{destination}")
async def get_weather(destination: str, start_date: str, num_days: int = 5):
    parsed_date = date.fromisoformat(start_date)
    forecast = await get_forecast(destination, parsed_date, num_days)
    return {"destination": destination, "forecast": forecast}
