"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTrip } from "@/lib/api";
import type { TravelStyle, GroupType } from "@/lib/types";
import { Plane, Loader2, MapPin, Calendar, DollarSign, Users } from "lucide-react";

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

  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.start_date || !form.end_date) {
      setError("Please fill in destination and dates.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { trip_id } = await createTrip({
        ...form,
        travel_style: selectedStyles,
        group_type: groupType,
      });
      router.push(`/trip/${trip_id}`);
    } catch (err) {
      setError("Failed to create trip. Is the backend running?");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-950 via-indigo-950 to-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
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
            onSubmit={handleSubmit}
            className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-left backdrop-blur"
          >
            <div className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                <MapPin className="h-4 w-4 text-indigo-400" /> Destination
              </label>
              <input
                type="text"
                placeholder="Kyoto, Japan"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <Calendar className="h-4 w-4 text-indigo-400" /> Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <Calendar className="h-4 w-4 text-indigo-400" /> End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-300">
                <DollarSign className="h-4 w-4 text-indigo-400" /> Total Budget: ${form.budget_usd.toLocaleString()} USD
              </label>
              <input
                type="range"
                min={300}
                max={10000}
                step={100}
                value={form.budget_usd}
                onChange={(e) => setForm({ ...form, budget_usd: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="mt-1 flex justify-between text-xs text-neutral-500">
                <span>$300 Budget</span>
                <span>$10,000 Luxury</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
                Travel Style <span className="text-neutral-500">(pick all that apply)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TRAVEL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleStyle(style.id)}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      selectedStyles.includes(style.id)
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                        : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-lg">{style.emoji}</div>
                    <div className="mt-0.5">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-300">
                <Users className="h-4 w-4 text-indigo-400" /> Group Type
              </label>
              <div className="flex gap-3">
                {GROUP_TYPES.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setGroupType(group.id)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-all ${
                      groupType === group.id
                        ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                        : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-lg">{group.emoji}</div>
                    <div className="mt-0.5">{group.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-base font-semibold text-white transition-all hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating your trip...
                </>
              ) : (
                <>
                  <Plane className="h-5 w-5" />
                  Plan My Trip with AI
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Feature row */}
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid grid-cols-3 gap-8 text-center">
          {[
            { emoji: "⚡", title: "Generates in seconds", desc: "Full 5-day itinerary with AI reasoning visible" },
            { emoji: "🌦️", title: "Weather-aware", desc: "Schedules outdoor activities on clear days automatically" },
            { emoji: "🔄", title: "Adapts in real time", desc: "Strike? Rain? It replans instantly with one click" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/5 bg-white/3 p-6">
              <div className="mb-3 text-3xl">{f.emoji}</div>
              <div className="mb-2 font-semibold text-white">{f.title}</div>
              <div className="text-sm text-neutral-500">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
