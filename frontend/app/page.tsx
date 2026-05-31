"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import type { TravelStyle, GroupType } from "@/lib/types";
import {
  Plane, Loader2, MapPin, Calendar, DollarSign,
  Users, Check, ChevronDown, UtensilsCrossed, Gauge, Hotel, Sparkles,
} from "lucide-react";

const TRAVEL_STYLES: { id: TravelStyle; label: string; emoji: string }[] = [
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "adventure", label: "Adventure", emoji: "🧗" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "history", label: "History", emoji: "📜" },
  { id: "relaxation", label: "Relaxation", emoji: "🧘" },
  { id: "nightlife", label: "Nightlife", emoji: "🌃" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
];

const GROUP_TYPES: { id: GroupType; label: string; emoji: string }[] = [
  { id: "solo", label: "Solo", emoji: "🧍" },
  { id: "couple", label: "Couple", emoji: "👫" },
  { id: "friends", label: "Friends", emoji: "👥" },
  { id: "family", label: "Family", emoji: "👨‍👩‍👧" },
];

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "kosher", label: "Kosher", emoji: "✡️" },
  { id: "gluten-free", label: "Gluten-Free", emoji: "🌾" },
  { id: "nut-free", label: "Nut-Free", emoji: "🥜" },
];

const PACE_OPTIONS = [
  { id: "slow", label: "Slow", desc: "Leisurely, few activities/day", emoji: "🐢" },
  { id: "moderate", label: "Moderate", desc: "Balanced mix of rest & sights", emoji: "🚶" },
  { id: "fast", label: "Fast", desc: "Maximize sights, packed days", emoji: "🏃" },
];

const ACCOMMODATION_OPTIONS = [
  { id: "budget", label: "Budget", desc: "Hostel / guesthouse", emoji: "🏕️" },
  { id: "mid-range", label: "Comfort", desc: "3-star hotel / Airbnb", emoji: "🏨" },
  { id: "luxury", label: "Luxury", desc: "4–5 star / boutique", emoji: "✨" },
];

const OCCASION_OPTIONS = [
  { id: "none", label: "Regular trip" },
  { id: "honeymoon", label: "Honeymoon 💍" },
  { id: "anniversary", label: "Anniversary 💑" },
  { id: "family", label: "Family holiday 👨‍👩‍👧" },
  { id: "birthday", label: "Birthday 🎂" },
  { id: "business", label: "Business + leisure 💼" },
];

const POPULAR_DESTINATIONS = [
  "Tokyo, Japan", "Kyoto, Japan", "Paris, France", "Rome, Italy",
  "Barcelona, Spain", "London, UK", "New York, USA", "Amsterdam, Netherlands",
  "Bangkok, Thailand", "Bali, Indonesia", "Dubai, UAE", "Singapore",
  "Sydney, Australia", "Istanbul, Turkey", "Prague, Czech Republic",
  "Santorini, Greece", "Lisbon, Portugal", "Vienna, Austria",
  "Seoul, South Korea", "Marrakech, Morocco", "Cape Town, South Africa",
  "Phuket, Thailand", "Maldives", "Zurich, Switzerland",
  "Copenhagen, Denmark", "Reykjavik, Iceland", "Vancouver, Canada",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([]);
  const [groupType, setGroupType] = useState<GroupType>("solo");
  const [dietary, setDietary] = useState<string[]>([]);
  const [pace, setPace] = useState("moderate");
  const [accommodation, setAccommodation] = useState("mid-range");
  const [occasion, setOccasion] = useState("none");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [form, setForm] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    budget_usd: 1500,
    group_size: 1,
    must_visit: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = todayStr();

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filterSuggestions = useCallback((query: string): string[] => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_DESTINATIONS.slice(0, 6);
    return POPULAR_DESTINATIONS.filter((d) => d.toLowerCase().includes(q)).slice(0, 6);
  }, []); // POPULAR_DESTINATIONS is module-level constant — no deps needed

  const handleDestinationChange = (value: string) => {
    setForm((f) => ({ ...f, destination: value }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const results = filterSuggestions(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setActiveSuggestion(-1);
    }, 150);
  };

  const selectSuggestion = (dest: string) => {
    setForm((f) => ({ ...f, destination: dest }));
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleDestKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeSuggestion >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeSuggestion]); }
    else if (e.key === "Escape") { setShowSuggestions(false); }
  };

  const handleStartDate = (value: string) => {
    setForm((f) => ({ ...f, start_date: value, end_date: f.end_date < value ? "" : f.end_date }));
  };

  const toggleDietary = (id: string) => {
    setDietary((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
  };

  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles((prev) => prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination.trim()) { setError("Please enter a destination."); return; }
    if (!form.start_date || !form.end_date) { setError("Please select travel dates."); return; }
    if (form.start_date < today) { setError("Start date cannot be in the past."); return; }
    if (form.end_date < form.start_date) { setError("End date must be after start date."); return; }
    setError("");
    setLoading(true);
    try {
      const { trip_id } = await createTrip({
        destination: form.destination.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        budget_usd: form.budget_usd,
        group_size: form.group_size,
        travel_style: selectedStyles.length > 0 ? selectedStyles : ["culture"],
        group_type: groupType,
        dietary_restrictions: dietary,
        pace,
        must_visit: form.must_visit.trim(),
        accommodation_type: accommodation,
        special_occasion: occasion,
        notes: form.notes.trim(),
      });
      router.push(`/trip/${trip_id}`);
    } catch (err: any) {
      setError(err?.message ?? "Failed to create trip. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <a href="#main-form" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white">
        Skip to form
      </a>

      <main id="main-content" className="min-h-screen">
        <div className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-indigo-950 to-neutral-950">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" aria-hidden="true" />

          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              AI-powered • Real-time adaptive • Living itineraries
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight text-white sm:text-6xl">
              Your trip, always
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent"> up to date</span>
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg text-neutral-400">
              Tell us what you love. Our AI builds a living itinerary that adapts to weather, strikes, and your mood — automatically.
            </p>

            <form
              id="main-form"
              onSubmit={handleSubmit}
              aria-label="Trip planning form"
              noValidate
              className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur-sm"
            >
              {/* Destination */}
              <div className="mb-6 relative" ref={suggestionsRef}>
                <label htmlFor="destination" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <MapPin className="h-4 w-4 text-indigo-400" aria-hidden="true" /> Destination
                </label>
                <input
                  ref={inputRef}
                  id="destination"
                  type="text"
                  placeholder="Start typing a city… e.g. Tokyo"
                  value={form.destination}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls="destination-listbox"
                  aria-activedescendant={activeSuggestion >= 0 ? `dest-opt-${activeSuggestion}` : undefined}
                  onChange={(e) => handleDestinationChange(e.target.value)}
                  onFocus={() => {
                    const r = filterSuggestions(form.destination);
                    setSuggestions(r);
                    setShowSuggestions(r.length > 0);
                  }}
                  onKeyDown={handleDestKeyDown}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showSuggestions && (
                  <ul id="destination-listbox" role="listbox" aria-label="Destination suggestions"
                    className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 shadow-xl overflow-hidden">
                    {suggestions.map((dest, i) => (
                      <li key={dest} id={`dest-opt-${i}`} role="option" aria-selected={i === activeSuggestion}>
                        <button type="button" onClick={() => selectSuggestion(dest)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${i === activeSuggestion ? "bg-indigo-600 text-white" : "text-neutral-300 hover:bg-indigo-500/20 hover:text-white"}`}>
                          <MapPin className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" aria-hidden="true" />
                          {dest}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dates */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-date" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" /> Start Date
                  </label>
                  <input id="start-date" type="date" value={form.start_date} min={today}
                    onChange={(e) => handleStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]" />
                </div>
                <div>
                  <label htmlFor="end-date" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" /> End Date
                  </label>
                  <input id="end-date" type="date" value={form.end_date} min={form.start_date || today}
                    onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]" />
                </div>
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label htmlFor="budget" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <DollarSign className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  Total Budget:{" "}
                  <span className="text-white font-semibold" aria-live="polite" aria-atomic="true">
                    ${form.budget_usd.toLocaleString()} USD
                  </span>
                </label>
                <input id="budget" type="range" min={300} max={10000} step={100} value={form.budget_usd}
                  aria-valuemin={300} aria-valuemax={10000} aria-valuenow={form.budget_usd}
                  aria-valuetext={`$${form.budget_usd.toLocaleString()} USD`}
                  onChange={(e) => setForm((f) => ({ ...f, budget_usd: Number(e.target.value) }))}
                  className="w-full accent-indigo-500" />
                <div className="mt-1 flex justify-between text-xs text-neutral-500" aria-hidden="true">
                  <span>$300</span><span>$10,000</span>
                </div>
              </div>

              {/* Travel Style */}
              <fieldset className="mb-6">
                <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300 w-full">
                  Travel Style <span className="text-neutral-500 font-normal">(pick all that apply)</span>
                  {selectedStyles.length > 0 && (
                    <span aria-live="polite" className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white font-medium">
                      {selectedStyles.length} selected
                    </span>
                  )}
                </legend>
                <div className="grid grid-cols-4 gap-2">
                  {TRAVEL_STYLES.map((style) => {
                    const on = selectedStyles.includes(style.id);
                    return (
                      <button key={style.id} type="button" aria-pressed={on}
                        aria-label={`${style.label}${on ? ", selected" : ""}`}
                        onClick={() => toggleStyle(style.id)}
                        className={`relative rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${on ? "border-indigo-400 bg-indigo-600 text-white" : "border-white/10 bg-white/5 text-neutral-400 hover:border-indigo-500/50 hover:bg-white/10"}`}>
                        {on && <Check className="absolute top-1 right-1 h-3 w-3 text-indigo-200" aria-hidden="true" />}
                        <div className="text-lg" aria-hidden="true">{style.emoji}</div>
                        <div className="mt-0.5 text-xs font-medium">{style.label}</div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Group Type */}
              <fieldset className="mb-6">
                <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" /> Group Type
                </legend>
                <div className="flex gap-3">
                  {GROUP_TYPES.map((g) => (
                    <button key={g.id} type="button" role="radio" aria-checked={groupType === g.id}
                      aria-label={g.label} onClick={() => setGroupType(g.id)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${groupType === g.id ? "border-indigo-400 bg-indigo-600 text-white" : "border-white/10 bg-white/5 text-neutral-400 hover:border-indigo-500/50 hover:bg-white/10"}`}>
                      <div className="text-lg" aria-hidden="true">{g.emoji}</div>
                      <div className="mt-0.5 text-xs font-medium">{g.label}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* ── Advanced Preferences ─────────────────────────────── */}
              <div className="mb-6 rounded-xl border border-white/10 overflow-hidden">
                <button
                  type="button"
                  aria-expanded={prefsOpen}
                  aria-controls="advanced-prefs"
                  onClick={() => setPrefsOpen((o) => !o)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                    Personalize your trip
                    <span className="text-xs text-neutral-500 font-normal">(dietary, pace, must-visit…)</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${prefsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>

                {prefsOpen && (
                  <div id="advanced-prefs" className="border-t border-white/10 px-4 pb-5 pt-4 space-y-5">
                    {/* Dietary Restrictions */}
                    <fieldset>
                      <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        <UtensilsCrossed className="h-4 w-4 text-orange-400" aria-hidden="true" />
                        Dietary Restrictions
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {DIETARY_OPTIONS.map((d) => {
                          const on = dietary.includes(d.id);
                          return (
                            <button key={d.id} type="button" aria-pressed={on}
                              aria-label={`${d.label}${on ? ", selected" : ""}`}
                              onClick={() => toggleDietary(d.id)}
                              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 ${on ? "border-orange-400 bg-orange-500/20 text-orange-200" : "border-white/10 bg-white/5 text-neutral-400 hover:border-orange-400/40"}`}>
                              <span aria-hidden="true">{d.emoji}</span> {d.label}
                              {on && <Check className="h-3 w-3" aria-hidden="true" />}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Pace */}
                    <fieldset>
                      <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        <Gauge className="h-4 w-4 text-blue-400" aria-hidden="true" />
                        Travel Pace
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {PACE_OPTIONS.map((p) => (
                          <button key={p.id} type="button" role="radio" aria-checked={pace === p.id}
                            onClick={() => setPace(p.id)}
                            className={`rounded-xl border px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 ${pace === p.id ? "border-blue-400 bg-blue-600/20 text-white" : "border-white/10 bg-white/5 text-neutral-400 hover:border-blue-400/40"}`}>
                            <div className="text-base" aria-hidden="true">{p.emoji}</div>
                            <div className="text-xs font-semibold mt-0.5">{p.label}</div>
                            <div className="text-xs text-neutral-500 mt-0.5 leading-tight">{p.desc}</div>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {/* Accommodation */}
                    <fieldset>
                      <legend className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        <Hotel className="h-4 w-4 text-purple-400" aria-hidden="true" />
                        Accommodation Type
                      </legend>
                      <div className="grid grid-cols-3 gap-2">
                        {ACCOMMODATION_OPTIONS.map((a) => (
                          <button key={a.id} type="button" role="radio" aria-checked={accommodation === a.id}
                            onClick={() => setAccommodation(a.id)}
                            className={`rounded-xl border px-3 py-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 ${accommodation === a.id ? "border-purple-400 bg-purple-600/20 text-white" : "border-white/10 bg-white/5 text-neutral-400 hover:border-purple-400/40"}`}>
                            <div className="text-base" aria-hidden="true">{a.emoji}</div>
                            <div className="text-xs font-semibold mt-0.5">{a.label}</div>
                            <div className="text-xs text-neutral-500 mt-0.5">{a.desc}</div>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {/* Special Occasion */}
                    <div>
                      <label htmlFor="occasion" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        <Sparkles className="h-4 w-4 text-pink-400" aria-hidden="true" />
                        Special Occasion
                      </label>
                      <select id="occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-sm text-white focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-400">
                        {OCCASION_OPTIONS.map((o) => (
                          <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Must-Visit */}
                    <div>
                      <label htmlFor="must-visit" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        <MapPin className="h-4 w-4 text-green-400" aria-hidden="true" />
                        Must-Visit Places or Activities
                        <span className="text-neutral-500 text-xs font-normal">(optional)</span>
                      </label>
                      <textarea id="must-visit" rows={2} placeholder="e.g. Senso-ji Temple, ramen in Shinjuku, Arashiyama bamboo grove…"
                        value={form.must_visit} maxLength={500}
                        onChange={(e) => setForm((f) => ({ ...f, must_visit: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                        Additional Notes
                        <span className="text-neutral-500 text-xs font-normal">(optional)</span>
                      </label>
                      <textarea id="notes" rows={2} placeholder="e.g. We have a 5-year-old, avoid long walks. We love street food markets."
                        value={form.notes} maxLength={500}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div role="alert" aria-live="assertive"
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} aria-disabled={loading}
                aria-label={loading ? "Creating your trip, please wait" : "Plan my trip with AI"}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-semibold text-white transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /><span>Creating your trip…</span></>
                  : <><Plane className="h-5 w-5" aria-hidden="true" /><span>Plan My Trip with AI</span></>}
              </button>
            </form>
          </div>
        </div>

        {/* Feature strip */}
        <section aria-label="Features" className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { emoji: "⚡", title: "Generates in seconds", desc: "Full itinerary with live AI reasoning stream" },
              { emoji: "🌦️", title: "Weather-aware", desc: "Outdoor activities automatically scheduled on clear days" },
              { emoji: "🔄", title: "Adapts in real time", desc: "Strike? Rain? Replans instantly with one click" },
            ].map((f) => (
              <article key={f.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="mb-3 text-3xl" aria-hidden="true">{f.emoji}</div>
                <h2 className="mb-2 text-base font-semibold text-white">{f.title}</h2>
                <p className="text-sm text-neutral-500">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
