export interface Activity {
  id?: string;
  sequence_order: number;
  name: string;
  type: "attraction" | "meal" | "transport" | "accommodation" | "rest";
  location_name: string;
  lat?: number;
  lng?: number;
  start_time: string;
  duration_minutes: number;
  cost_usd: number;
  description: string;
  insider_tip?: string;
  status: "suggested" | "confirmed" | "replaced";
  replanned?: boolean;
}

export interface ItineraryDay {
  day_number: number;
  date: string;
  theme: string;
  ai_reasoning: string;
  weather_condition?: string;
  weather_temp_c?: number;
  rain_probability?: number;
  activities: Activity[];
  replanned?: boolean;
  changes_summary?: string;
}

export interface Itinerary {
  overall_reasoning: string;
  total_estimated_cost: number;
  destination: string;
  travel_style: string;
  days: ItineraryDay[];
}

export interface Trip {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget_usd: number;
  travel_style: string[];
  group_type: string;
  group_size: number;
  status: string;
  itinerary: Itinerary | null;
}

export interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  body: string;
  affected_day_numbers: number[];
  resolved: boolean;
  created_at?: string;
}

export type TravelStyle = "culture" | "food" | "adventure" | "relaxation" | "nightlife" | "nature" | "shopping" | "history";
export type GroupType = "solo" | "couple" | "friends" | "family";
