const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface CreateTripPayload {
  destination: string;
  start_date: string;
  end_date: string;
  budget_usd: number;
  travel_style: string[];
  group_type: string;
  group_size: number;
  dietary_restrictions: string[];
  pace: string;
  must_visit: string;
  accommodation_type: string;
  special_occasion: string;
  notes: string;
}

export async function createTrip(data: CreateTripPayload): Promise<{ trip_id: string }> {
  const res = await fetch(`${API_BASE}/api/trips`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail || `Server error ${res.status}`);
  }
  return res.json();
}

export async function generateTrip(tripId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/generate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate trip");
  return res.json();
}

export function streamTripGeneration(
  tripId: string,
  onChunk: (text: string) => void,
  onComplete: (itinerary: any) => void,
  onError: (err: string) => void
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/trips/${tripId}/generate/stream`, {
    method: "POST",
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Stream failed: ${res.status}`);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "chunk") onChunk(event.content);
              if (event.type === "complete") onComplete(event.itinerary);
              if (event.type === "error") onError(event.message);
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") onError(err.message);
    });

  return () => controller.abort();
}

export async function replanTrip(
  tripId: string,
  data: {
    trigger: string;
    reason: string;
    affected_days: number[];
    current_itinerary: any;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/replan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to replan trip");
  return res.json();
}

export async function getAlerts(tripId: string): Promise<{ alerts: any[] }> {
  const res = await fetch(`${API_BASE}/api/trips/${tripId}/alerts`);
  if (!res.ok) throw new Error("Failed to fetch alerts");
  return res.json();
}
