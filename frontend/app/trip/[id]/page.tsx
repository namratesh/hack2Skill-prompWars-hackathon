"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { streamTripGeneration, replanTrip } from "@/lib/api";
import type { Itinerary, Alert } from "@/lib/types";
import { Loader2, AlertTriangle, Zap, DollarSign, Plane } from "lucide-react";
import Link from "next/link";

const WEATHER_ICON: Record<string, string> = {
  Clear: "☀️", Clouds: "⛅", Rain: "🌧️", Drizzle: "🌦️",
  Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Unknown: "🌡️",
};

const TYPE_COLOR: Record<string, string> = {
  attraction: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  meal: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  transport: "bg-neutral-500/20 text-neutral-300 border-neutral-500/30",
  accommodation: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  rest: "bg-green-500/20 text-green-300 border-green-500/30",
};

const TYPE_EMOJI: Record<string, string> = {
  attraction: "🏛️", meal: "🍽️", transport: "🚉",
  accommodation: "🏨", rest: "☕",
};

export default function TripPage() {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [replanning, setReplanning] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const reasoningRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    const cancel = streamTripGeneration(
      id,
      (chunk) => {
        setReasoning((prev) => prev + chunk);
        if (reasoningRef.current) {
          reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight;
        }
      },
      (itin) => {
        setItinerary(itin);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoadError(err || "Failed to generate itinerary. Please try again.");
        setLoading(false);
      }
    );
    return cancel;
  }, [id]);

  const handleSimulateStrike = async () => {
    if (!itinerary) return;
    setReplanning(true);
    try {
      const result = await replanTrip(id, {
        trigger: "strike",
        reason: "JR West train operators announced a 24-hour strike. All rail routes in the Kinki region are suspended.",
        affected_days: [3],
        current_itinerary: itinerary,
      });
      setItinerary(result.updated_itinerary);
      setAlerts((prev) => [result.alert, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setReplanning(false);
    }
  };

  const handleSimulateRain = async () => {
    if (!itinerary) return;
    setReplanning(true);
    try {
      const result = await replanTrip(id, {
        trigger: "weather",
        reason: "Heavy rainfall warning issued for days 2 and 3. Outdoor activities are inadvisable.",
        affected_days: [2, 3],
        current_itinerary: itinerary,
      });
      setItinerary(result.updated_itinerary);
      setAlerts((prev) => [result.alert, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setReplanning(false);
    }
  };

  const totalSpent = itinerary
    ? itinerary.days.flatMap((d) => d.activities).reduce((sum, a) => sum + (a.cost_usd || 0), 0)
    : 0;

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Skip navigation */}
      <a
        href="#itinerary-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to itinerary
      </a>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            aria-label="Back to Travel Engine home"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
          >
            <Plane className="h-4 w-4" aria-hidden="true" />
            Travel Engine
          </Link>
          {itinerary && (
            <div
              aria-label={`Budget: $${Math.round(totalSpent).toLocaleString()} of $${itinerary.total_estimated_cost?.toLocaleString() || "?"} estimated`}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm"
            >
              <DollarSign className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />
              <span className="text-neutral-300">${Math.round(totalSpent).toLocaleString()}</span>
              <span className="text-neutral-600" aria-hidden="true">/</span>
              <span className="text-neutral-400">${itinerary.total_estimated_cost?.toLocaleString() || "?"}</span>
            </div>
          )}
        </div>
      </header>

      <main id="itinerary-content" className="mx-auto max-w-6xl px-6 py-8">
        {/* Alerts */}
        {alerts.length > 0 && (
          <section aria-label="Travel alerts" aria-live="polite" aria-atomic="false" className="mb-6 space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                role="alert"
                className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
              >
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-amber-300">{alert.title}</p>
                  <p className="mt-1 text-sm text-amber-400/80">{alert.body}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <section aria-label="Generating itinerary" aria-live="polite">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" aria-hidden="true" />
              <span className="text-neutral-300 font-medium">AI is planning your trip...</span>
            </div>
            <div
              ref={reasoningRef}
              role="log"
              aria-label="AI planning reasoning stream"
              aria-live="polite"
              aria-atomic="false"
              className="h-64 overflow-y-auto rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 font-mono text-sm text-indigo-200 leading-relaxed mb-6"
            >
              {reasoning || "Analyzing destination, weather patterns, and budget constraints..."}
            </div>
            <div className="grid grid-cols-3 gap-4" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl border border-white/5 bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          </section>
        )}

        {/* Error State */}
        {!loading && loadError && (
          <section
            role="alert"
            aria-label="Error loading itinerary"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="mb-4 text-5xl" aria-hidden="true">⚠️</div>
            <h1 className="mb-2 text-xl font-semibold text-white">Could not generate itinerary</h1>
            <p className="mb-6 text-sm text-neutral-400 max-w-md">{loadError}</p>
            <Link
              href="/"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              ← Back to planner
            </Link>
          </section>
        )}

        {/* Itinerary View */}
        {!loading && !loadError && itinerary && (
          <div className="space-y-8">
            {/* Overview */}
            <section aria-label="Trip overview" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h1 className="mb-1 text-2xl font-bold text-white">{itinerary.destination}</h1>
              <p className="mb-4 text-sm text-neutral-400">{itinerary.days.length} days · {itinerary.travel_style}</p>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">AI Planning Reasoning</p>
                <p className="text-sm text-neutral-300 leading-relaxed">{itinerary.overall_reasoning}</p>
              </div>
            </section>

            {/* Demo Controls */}
            <section aria-label="Simulate disruptions" className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-4 text-sm font-semibold text-neutral-300">
                <Zap className="inline h-4 w-4 text-amber-400 mr-1" aria-hidden="true" />
                Simulate Real-World Disruptions
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSimulateStrike}
                  disabled={replanning}
                  aria-disabled={replanning}
                  aria-label="Simulate train strike on Day 3 and replan itinerary"
                  className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {replanning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <span aria-hidden="true">🚉</span>}
                  Simulate Train Strike (Day 3)
                </button>
                <button
                  onClick={handleSimulateRain}
                  disabled={replanning}
                  aria-disabled={replanning}
                  aria-label="Simulate heavy rain warning for Days 2 and 3 and replan itinerary"
                  className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-300 hover:bg-blue-500/20 transition-all disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {replanning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <span aria-hidden="true">🌧️</span>}
                  Simulate Rain Warning (Days 2–3)
                </button>
              </div>
              {replanning && (
                <div aria-live="polite" className="mt-4 flex items-center gap-2 text-sm text-amber-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Replanning affected days with minimal changes...
                </div>
              )}
            </section>

            {/* Day Tabs */}
            <nav aria-label="Itinerary days">
              <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
                {itinerary.days.map((day) => (
                  <button
                    key={day.day_number}
                    role="tab"
                    aria-selected={activeDay === day.day_number}
                    aria-controls={`day-panel-${day.day_number}`}
                    id={`day-tab-${day.day_number}`}
                    onClick={() => setActiveDay(day.day_number)}
                    className={`flex-shrink-0 rounded-xl border px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                      activeDay === day.day_number
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                        : day.replanned
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20"
                    }`}
                  >
                    Day {day.day_number}
                    {day.replanned && <span aria-label="replanned"> ✦</span>}
                    {day.weather_condition && (
                      <span aria-label={day.weather_condition} className="ml-1.5">
                        {WEATHER_ICON[day.weather_condition] || "🌡️"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>

            {/* Active Day Panel */}
            {itinerary.days
              .filter((d) => d.day_number === activeDay)
              .map((day) => (
                <section
                  key={day.day_number}
                  id={`day-panel-${day.day_number}`}
                  role="tabpanel"
                  aria-labelledby={`day-tab-${day.day_number}`}
                  className={`rounded-2xl border p-6 ${
                    day.replanned ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/5"
                  }`}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        Day {day.day_number}: {day.theme}
                      </h2>
                      <p className="text-sm text-neutral-500">{day.date}</p>
                      {day.replanned && (
                        <span className="mt-1 inline-block rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                          ✦ Replanned
                        </span>
                      )}
                    </div>
                    {day.weather_condition && (
                      <div className="text-right" aria-label={`Weather: ${day.weather_condition}${day.weather_temp_c ? `, ${day.weather_temp_c}°C` : ""}${day.rain_probability !== undefined ? `, ${day.rain_probability}% chance of rain` : ""}`}>
                        <div className="text-2xl" aria-hidden="true">{WEATHER_ICON[day.weather_condition] || "🌡️"}</div>
                        <div className="text-sm text-neutral-400" aria-hidden="true">{day.weather_condition}</div>
                        {day.weather_temp_c && <div className="text-sm text-neutral-500" aria-hidden="true">{day.weather_temp_c}°C</div>}
                        {day.rain_probability !== undefined && <div className="text-sm text-blue-400" aria-hidden="true">{day.rain_probability}% rain</div>}
                      </div>
                    )}
                  </div>

                  <div className="mb-5 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1">AI Reasoning</p>
                    <p className="text-sm text-neutral-300">{day.ai_reasoning}</p>
                    {day.changes_summary && (
                      <p className="mt-2 text-sm text-amber-400 border-t border-amber-500/20 pt-2">
                        Changes: {day.changes_summary}
                      </p>
                    )}
                  </div>

                  <ol className="space-y-3" aria-label={`Activities for Day ${day.day_number}`}>
                    {day.activities.map((activity) => (
                      <li
                        key={`${activity.sequence_order}-${activity.name}`}
                        className={`rounded-xl border p-4 transition-all ${
                          activity.replanned ? "border-amber-500/30 bg-amber-500/5" : "border-white/5 bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">
                              {TYPE_EMOJI[activity.type] || "📍"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white">{activity.name}</p>
                                {activity.replanned && (
                                  <span className="text-xs text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                                    new
                                  </span>
                                )}
                                <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${TYPE_COLOR[activity.type] || ""}`}>
                                  {activity.type}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-400 mt-0.5">
                                <span className="sr-only">Location: </span>{activity.location_name}
                                <span aria-hidden="true"> · </span>
                                <span className="sr-only">, Time: </span>{activity.start_time}
                                <span aria-hidden="true"> · </span>
                                <span className="sr-only">, Duration: </span>{activity.duration_minutes} min
                              </p>
                              <p className="mt-1.5 text-sm text-neutral-300">{activity.description}</p>
                              {activity.insider_tip && (
                                <p className="mt-1.5 text-sm text-amber-400/80 italic">
                                  <span aria-label="Insider tip:">💡</span> {activity.insider_tip}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="font-semibold text-green-400" aria-label={`Cost: ${activity.cost_usd === 0 ? "Free" : `$${activity.cost_usd}`}`}>
                              {activity.cost_usd === 0 ? "Free" : `$${activity.cost_usd}`}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}

            {/* Budget Summary */}
            <section aria-label="Budget overview" className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="mb-4 font-semibold text-white">Budget Overview</h2>
              <div className="space-y-3">
                {itinerary.days.map((day) => {
                  const dayTotal = day.activities.reduce((s, a) => s + (a.cost_usd || 0), 0);
                  const pct = Math.min((dayTotal / (itinerary.total_estimated_cost / itinerary.days.length)) * 100, 100);
                  return (
                    <div key={day.day_number} className="flex items-center gap-3">
                      <span className="w-12 text-sm text-neutral-500" aria-hidden="true">Day {day.day_number}</span>
                      <div
                        className="flex-1 h-2 rounded-full bg-white/5"
                        role="progressbar"
                        aria-label={`Day ${day.day_number} budget`}
                        aria-valuenow={Math.round(pct)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuetext={`$${Math.round(dayTotal)}`}
                      >
                        <div
                          className="h-2 rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <span className="w-16 text-right text-sm text-neutral-300">${Math.round(dayTotal)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-white/10 pt-3 flex justify-between">
                  <span className="font-semibold text-white">Total Estimated</span>
                  <span className="font-semibold text-green-400">${Math.round(totalSpent).toLocaleString()}</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
