PLANNER_SYSTEM = """You are an expert travel planner. Output ONLY valid JSON with no explanation outside the JSON block."""

PLANNER_USER_TEMPLATE = """Create a travel itinerary:

Destination: {destination}
Dates: {start_date} to {end_date} ({num_days} days)
Budget: ${budget_usd} USD total
Travel Style: {travel_style}
Group: {group_type}, {group_size} person(s)
Pace: {pace} | Accommodation: {accommodation_type}
Dietary: {dietary_restrictions} | Occasion: {special_occasion}
Must-visit: {must_visit}
Notes: {notes}

Output this exact JSON (no text before or after):
{{
  "overall_reasoning": "2 sentences on your planning approach",
  "total_estimated_cost": 0.00,
  "days": [
    {{
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "theme": "Theme name",
      "ai_reasoning": "1 sentence why this day is structured this way",
      "activities": [
        {{
          "sequence_order": 1,
          "name": "Activity name",
          "type": "attraction|meal|transport|accommodation|rest",
          "location_name": "Venue name",
          "start_time": "09:00",
          "duration_minutes": 90,
          "cost_usd": 0.00,
          "description": "1-2 sentences on what makes this special",
          "insider_tip": "One practical tip"
        }}
      ]
    }}
  ]
}}

Rules: 3-4 activities per day. Keep descriptions concise. No markdown, no code fences."""


REPLAN_SYSTEM = """You are a travel replanner. Output ONLY valid JSON with no explanation outside the JSON."""

REPLAN_USER_TEMPLATE = """Disruption: {trigger} — {reason}
Affected days: {affected_days}
Destination: {destination} | Budget left: ${budget_remaining} | Style: {travel_style}

Current affected days:
{affected_itinerary_json}

Replan ONLY the affected days with minimum changes. Output JSON:
{{
  "replan_reasoning": "What changed and why it works",
  "changed_days": [
    {{
      "day_number": 1,
      "theme": "Updated theme",
      "ai_reasoning": "Why this works despite the disruption",
      "activities": [ /* same structure as original */ ],
      "changes_summary": "Brief list of what changed"
    }}
  ]
}}"""
