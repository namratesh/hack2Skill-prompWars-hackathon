"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import type { TravelStyle, GroupType } from "@/lib/types";
import { Plane, Loader2, MapPin, Calendar, DollarSign, Users, Check } from "lucide-react";

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

const POPULAR_DESTINATIONS = [
  "Tokyo, Japan", "Kyoto, Japan", "Paris, France", "Rome, Italy",
  "Barcelona, Spain", "London, UK", "New York, USA", "Amsterdam, Netherlands",
  "Bangkok, Thailand", "Bali, Indonesia", "Dubai, UAE", "Singapore",
  "Sydney, Australia", "Istanbul, Turkey", "Prague, Czech Republic",
  "Santorini, Greece", "Lisbon, Portugal", "Vienna, Austria",
  "Seoul, South Korea", "Marrakech, Morocco", "Cape Town, South Africa",
  "Mexico City, Mexico", "Buenos Aires, Argentina", "Phuket, Thailand",
  "Maldives", "Zurich, Switzerland", "Copenhagen, Denmark",
  "Stockholm, Sweden", "Reykjavik, Iceland", "Vancouver, Canada",
];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>([]);
  const [groupType, setGroupType] = useState<GroupType>("solo");
  const [form, setForm] = useState({
    destination: "",
    start_date: "",
    end_date: "",
    budget_usd: 1500,
    group_size: 1,
  });
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = todayStr();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openSuggestions = (query: string) => {
    const filtered = query.trim()
      ? POPULAR_DESTINATIONS.filter((d) => d.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
      : POPULAR_DESTINATIONS.slice(0, 6);
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setActiveSuggestion(-1);
  };

  const selectSuggestion = (dest: string) => {
    setForm({ ...form, destination: dest });
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleDestinationKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeSuggestion >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleStartDateChange = (value: string) => {
    const newForm = { ...form, start_date: value };
    if (form.end_date && form.end_date < value) newForm.end_date = "";
    setForm(newForm);
  };

  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
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
        ...form,
        travel_style: selectedStyles.length > 0 ? selectedStyles : ["culture"],
        group_type: groupType,
      });
      router.push(`/trip/${trip_id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create trip. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      {/* Skip to main content */}
      <a
        href="#main-form"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to form
      </a>

      <main id="main-content" className="min-h-screen">
        {/* Hero */}
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
              Not a static plan. A living itinerary that adapts to weather changes,
              transit strikes, and your mood — automatically.
            </p>

            {/* Form Card */}
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
                  <MapPin className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  Destination
                </label>
                <input
                  ref={inputRef}
                  id="destination"
                  type="text"
                  placeholder="Start typing a city, e.g. Tokyo..."
                  value={form.destination}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions}
                  aria-controls="destination-listbox"
                  aria-activedescendant={activeSuggestion >= 0 ? `suggestion-${activeSuggestion}` : undefined}
                  onChange={(e) => { setForm({ ...form, destination: e.target.value }); openSuggestions(e.target.value); }}
                  onFocus={() => openSuggestions(form.destination)}
                  onKeyDown={handleDestinationKeyDown}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul
                    id="destination-listbox"
                    role="listbox"
                    aria-label="Destination suggestions"
                    className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-neutral-900 shadow-xl overflow-hidden"
                  >
                    {suggestions.map((dest, i) => (
                      <li
                        key={dest}
                        id={`suggestion-${i}`}
                        role="option"
                        aria-selected={i === activeSuggestion}
                      >
                        <button
                          type="button"
                          onClick={() => selectSuggestion(dest)}
                          className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${
                            i === activeSuggestion
                              ? "bg-indigo-600 text-white"
                              : "text-neutral-300 hover:bg-indigo-500/20 hover:text-white"
                          }`}
                        >
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
                    <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                    Start Date
                  </label>
                  <input
                    id="start-date"
                    type="date"
                    value={form.start_date}
                    min={today}
                    aria-describedby="date-hint"
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label htmlFor="end-date" className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                    <Calendar className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                    End Date
                  </label>
                  <input
                    id="end-date"
                    type="date"
                    value={form.end_date}
                    min={form.start_date || today}
                    aria-describedby="date-hint"
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                  />
                </div>
                <p id="date-hint" className="sr-only">Select a future date. End date must be after start date.</p>
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
                <input
                  id="budget"
                  type="range"
                  min={300}
                  max={10000}
                  step={100}
                  value={form.budget_usd}
                  aria-valuemin={300}
                  aria-valuemax={10000}
                  aria-valuenow={form.budget_usd}
                  aria-valuetext={`$${form.budget_usd.toLocaleString()} USD`}
                  onChange={(e) => setForm({ ...form, budget_usd: Number(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
                <div className="mt-1 flex justify-between text-xs text-neutral-500" aria-hidden="true">
                  <span>$300 Budget</span>
                  <span>$10,000 Luxury</span>
                </div>
              </div>

              {/* Travel Style */}
              <fieldset className="mb-6">
                <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  Travel Style
                  <span className="text-neutral-500 font-normal">(pick all that apply)</span>
                  {selectedStyles.length > 0 && (
                    <span
                      aria-live="polite"
                      aria-atomic="true"
                      className="ml-auto rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white font-medium"
                    >
                      {selectedStyles.length} selected
                    </span>
                  )}
                </legend>
                <div className="grid grid-cols-4 gap-2" role="group" aria-label="Travel style options">
                  {TRAVEL_STYLES.map((style) => {
                    const isSelected = selectedStyles.includes(style.id);
                    return (
                      <button
                        key={style.id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${style.label} travel style${isSelected ? ", selected" : ""}`}
                        onClick={() => toggleStyle(style.id)}
                        className={`relative rounded-xl border px-3 py-2.5 text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-neutral-950 ${
                          isSelected
                            ? "border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                            : "border-white/10 bg-white/5 text-neutral-400 hover:border-indigo-500/50 hover:bg-white/10 hover:text-neutral-200"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-1 right-1" aria-hidden="true">
                            <Check className="h-3 w-3 text-indigo-200" />
                          </span>
                        )}
                        <div className="text-lg" aria-hidden="true">{style.emoji}</div>
                        <div className="mt-0.5 text-xs font-medium">{style.label}</div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {/* Group Type */}
              <fieldset className="mb-8">
                <legend className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <Users className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                  Group Type
                </legend>
                <div className="flex gap-3" role="radiogroup" aria-label="Group type">
                  {GROUP_TYPES.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      role="radio"
                      aria-checked={groupType === group.id}
                      aria-label={`${group.label} group`}
                      onClick={() => setGroupType(group.id)}
                      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 focus:ring-offset-neutral-950 ${
                        groupType === group.id
                          ? "border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                          : "border-white/10 bg-white/5 text-neutral-400 hover:border-indigo-500/50 hover:bg-white/10 hover:text-neutral-200"
                      }`}
                    >
                      <div className="text-lg" aria-hidden="true">{group.emoji}</div>
                      <div className="mt-0.5 text-xs font-medium">{group.label}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-disabled={loading}
                aria-label={loading ? "Creating your trip, please wait" : "Plan my trip with AI"}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-semibold text-white transition-all hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>Creating your trip...</span>
                  </>
                ) : (
                  <>
                    <Plane className="h-5 w-5" aria-hidden="true" />
                    <span>Plan My Trip with AI</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Feature row */}
        <section aria-label="Features" className="mx-auto max-w-4xl px-6 py-16">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { emoji: "⚡", title: "Generates in seconds", desc: "Full 5-day itinerary with AI reasoning visible" },
              { emoji: "🌦️", title: "Weather-aware", desc: "Schedules outdoor activities on clear days automatically" },
              { emoji: "🔄", title: "Adapts in real time", desc: "Strike? Rain? It replans instantly with one click" },
            ].map((f) => (
              <article key={f.title} className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
                <div className="mb-3 text-3xl" aria-hidden="true">{f.emoji}</div>
                <h2 className="mb-2 font-semibold text-white text-base">{f.title}</h2>
                <p className="text-sm text-neutral-500">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
