import httpx
import os
from datetime import date, timedelta


async def get_forecast(destination: str, start_date: date, num_days: int) -> list[dict]:
    api_key = os.environ.get("OPENWEATHER_API_KEY")
    if not api_key:
        return _mock_forecast(start_date, num_days)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            geo_resp = await client.get(
                "https://api.openweathermap.org/geo/1.0/direct",
                params={"q": destination, "limit": 1, "appid": api_key},
            )
            geo_resp.raise_for_status()
            geo = geo_resp.json()
            if not geo:
                return _mock_forecast(start_date, num_days)

            lat, lon = geo[0]["lat"], geo[0]["lon"]
            weather_resp = await client.get(
                "https://api.openweathermap.org/data/2.5/forecast",
                params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric", "cnt": 40},
            )
            weather_resp.raise_for_status()
            forecast_data = weather_resp.json()

        daily = {}
        for item in forecast_data["list"]:
            day = item["dt_txt"][:10]
            if day not in daily:
                daily[day] = {
                    "condition": item["weather"][0]["main"],
                    "temp_c": round(item["main"]["temp"], 1),
                    "rain_probability": int(item.get("pop", 0) * 100),
                }

        result = []
        for i in range(num_days):
            day_str = (start_date + timedelta(days=i)).isoformat()
            weather = daily.get(day_str, {"condition": "Clear", "temp_c": 22, "rain_probability": 10})
            result.append({"date": day_str, **weather})
        return result

    except Exception:
        return _mock_forecast(start_date, num_days)


def _mock_forecast(start_date: date, num_days: int) -> list[dict]:
    conditions = ["Clear", "Clear", "Clouds", "Rain", "Clear"]
    return [
        {
            "date": (start_date + timedelta(days=i)).isoformat(),
            "condition": conditions[i % len(conditions)],
            "temp_c": 22 + (i % 3),
            "rain_probability": 20 if conditions[i % len(conditions)] != "Rain" else 75,
        }
        for i in range(num_days)
    ]
