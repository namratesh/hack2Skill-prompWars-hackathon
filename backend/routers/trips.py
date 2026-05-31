import asyncio
import json
import re
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from models.schemas import TripCreateRequest, ReplanRequest
from agents.orchestrator import generate_itinerary, replan_itinerary

router = APIRouter(prefix="/api/trips", tags=["trips"])

_trip_store: dict[str, dict] = {}


def _clean_json(text: str) -> str:
    """Strip markdown fences and locate the JSON object in raw LLM output."""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    if m:
        return m.group(1).strip()
    idx = text.find("{")
    return text[idx:] if idx != -1 else text


def _repair_json(text: str) -> str:
    """
    Best-effort repair of truncated JSON by closing any open
    strings, arrays, and objects in reverse stack order.
    Only used when json.loads() fails on the first attempt.
    """
    in_string = False
    escape_next = False
    stack: list[str] = []

    for ch in text:
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch in ("{", "["):
                stack.append(ch)
            elif ch == "}" and stack and stack[-1] == "{":
                stack.pop()
            elif ch == "]" and stack and stack[-1] == "[":
                stack.pop()

    # Close an unterminated string first
    if in_string:
        text += '"'
    # Close open containers in reverse order
    for bracket in reversed(stack):
        text += "}" if bracket == "{" else "]"
    return text


def _parse_itinerary(raw: str) -> dict:
    """Parse LLM output to JSON, repairing truncation if needed."""
    clean = _clean_json(raw)
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        return json.loads(_repair_json(clean))


def _build_request(trip_data: dict) -> TripCreateRequest:
    return TripCreateRequest(
        destination=trip_data["destination"],
        start_date=trip_data["start_date"],
        end_date=trip_data["end_date"],
        budget_usd=trip_data["budget_usd"],
        travel_style=trip_data["travel_style"],
        group_type=trip_data["group_type"],
        group_size=trip_data["group_size"],
        dietary_restrictions=trip_data.get("dietary_restrictions", []),
        pace=trip_data.get("pace", "moderate"),
        must_visit=trip_data.get("must_visit", ""),
        accommodation_type=trip_data.get("accommodation_type", "mid-range"),
        special_occasion=trip_data.get("special_occasion", "none"),
        notes=trip_data.get("notes", ""),
    )


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
    itinerary = await generate_itinerary(_build_request(trip_data))
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
    request = _build_request(trip_data)

    PROGRESS = [
        "Analyzing destination, season and weather patterns...",
        "Clustering neighbourhoods to minimise transit time...",
        "Allocating budget across days...",
        "Selecting authentic local experiences...",
        "Honouring your must-visit places and dietary preferences...",
        "Finalising your personalised itinerary...",
    ]

    async def event_generator():
        # Run the reliable non-streaming LLM call in the background.
        # stream_itinerary was dropping mid-JSON; generate_itinerary
        # uses call_llm which retries across models and guarantees
        # complete JSON before returning.
        llm_task = asyncio.create_task(generate_itinerary(request))

        # Emit progress ticks every ~3 s while we wait, so the browser
        # sees a live reasoning feed instead of a blank loading screen.
        for msg in PROGRESS:
            if llm_task.done():
                break
            yield f"data: {json.dumps({'type': 'chunk', 'content': msg + '\n'})}\n\n"
            try:
                await asyncio.wait_for(asyncio.shield(llm_task), timeout=3.0)
                break
            except asyncio.TimeoutError:
                continue

        try:
            itinerary = await llm_task
            itinerary["destination"] = trip_data["destination"]
            itinerary["travel_style"] = ", ".join(trip_data["travel_style"])
            _trip_store[trip_id]["itinerary"] = itinerary
            _trip_store[trip_id]["status"] = "generated"
            yield f"data: {json.dumps({'type': 'complete', 'itinerary': itinerary})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

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
    trip_data.setdefault("alerts", []).append(alert)

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
