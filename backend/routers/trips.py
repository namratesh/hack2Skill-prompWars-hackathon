import json
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TripCreateRequest, ReplanRequest
from agents.orchestrator import generate_itinerary, stream_itinerary, replan_itinerary

router = APIRouter(prefix="/api/trips", tags=["trips"])

_trip_store: dict[str, dict] = {}


@router.post("")
async def create_trip(request: TripCreateRequest):
    trip_id = str(uuid.uuid4())
    _trip_store[trip_id] = {
        "id": trip_id,
        "destination": request.destination,
        "start_date": request.start_date.isoformat(),
        "end_date": request.end_date.isoformat(),
        "budget_usd": request.budget_usd,
        "travel_style": request.travel_style,
        "group_type": request.group_type,
        "group_size": request.group_size,
        "dietary_restrictions": request.dietary_restrictions,
        "pace": request.pace,
        "must_visit": request.must_visit,
        "accommodation_type": request.accommodation_type,
        "special_occasion": request.special_occasion,
        "notes": request.notes,
        "status": "created",
        "itinerary": None,
    }
    return {"trip_id": trip_id, "status": "created"}


@router.post("/{trip_id}/generate")
async def generate_trip(trip_id: str):
    if trip_id not in _trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip_data = _trip_store[trip_id]
    request = TripCreateRequest(
        destination=trip_data["destination"],
        start_date=trip_data["start_date"],
        end_date=trip_data["end_date"],
        budget_usd=trip_data["budget_usd"],
        travel_style=trip_data["travel_style"],
        group_type=trip_data["group_type"],
        group_size=trip_data["group_size"],
    )

    itinerary = await generate_itinerary(request)
    itinerary["destination"] = trip_data["destination"]
    itinerary["travel_style"] = ", ".join(trip_data["travel_style"])

    _trip_store[trip_id]["itinerary"] = itinerary
    _trip_store[trip_id]["status"] = "generated"

    return {"trip_id": trip_id, "itinerary": itinerary}


@router.post("/{trip_id}/generate/stream")
async def generate_trip_stream(trip_id: str):
    if trip_id not in _trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip_data = _trip_store[trip_id]
    request = TripCreateRequest(
        destination=trip_data["destination"],
        start_date=trip_data["start_date"],
        end_date=trip_data["end_date"],
        budget_usd=trip_data["budget_usd"],
        travel_style=trip_data["travel_style"],
        group_type=trip_data["group_type"],
        group_size=trip_data["group_size"],
    )

    async def event_generator():
        collected = []
        async for chunk in stream_itinerary(request):
            collected.append(chunk)
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

        full_text = "".join(collected)
        try:
            itinerary = json.loads(full_text)
            itinerary["destination"] = trip_data["destination"]
            itinerary["travel_style"] = ", ".join(trip_data["travel_style"])
            _trip_store[trip_id]["itinerary"] = itinerary
            _trip_store[trip_id]["status"] = "generated"
            yield f"data: {json.dumps({'type': 'complete', 'itinerary': itinerary})}\n\n"
        except json.JSONDecodeError:
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to parse itinerary'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/{trip_id}")
async def get_trip(trip_id: str):
    if trip_id not in _trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")
    return _trip_store[trip_id]


@router.post("/{trip_id}/replan")
async def replan_trip(trip_id: str, request: ReplanRequest):
    if trip_id not in _trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip_data = _trip_store[trip_id]
    if not trip_data.get("itinerary"):
        raise HTTPException(status_code=400, detail="No itinerary to replan")

    request.current_itinerary = trip_data["itinerary"]
    replan_result = await replan_itinerary(request)

    current_days = {d["day_number"]: d for d in trip_data["itinerary"].get("days", [])}
    for updated_day in replan_result.get("changed_days", []):
        updated_day["replanned"] = True
        current_days[updated_day["day_number"]] = updated_day

    trip_data["itinerary"]["days"] = sorted(current_days.values(), key=lambda d: d["day_number"])

    alert = {
        "id": str(uuid.uuid4()),
        "type": request.trigger,
        "severity": "warning",
        "title": f"Itinerary updated: {request.trigger}",
        "body": replan_result.get("replan_reasoning", request.reason),
        "affected_day_numbers": request.affected_days,
        "resolved": False,
    }

    if "alerts" not in trip_data:
        trip_data["alerts"] = []
    trip_data["alerts"].append(alert)

    return {
        "trip_id": trip_id,
        "replan_result": replan_result,
        "updated_itinerary": trip_data["itinerary"],
        "alert": alert,
    }


@router.get("/{trip_id}/alerts")
async def get_alerts(trip_id: str):
    if trip_id not in _trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"alerts": _trip_store[trip_id].get("alerts", [])}
