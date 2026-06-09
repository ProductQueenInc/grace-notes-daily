import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Play, Loader2 } from "lucide-react";
import { useAudioPlayer, type Track } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { pickListenRailTitle } from "@/lib/personalization";
import { useAuth } from "@/hooks/use-auth";
import { getTracks } from "@/lib/tracks.functions";
import { getSignedAudioUrl } from "@/lib/listen-audio.functions";

export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Listen /></AppShell></RequireAuth>,
});

const CATEGORIES = ["All", "Praise", "Worship", "Preaching", "Podcast"];
const TYPES = ["All", "Video", "Audio"];

// Fallback curated list — used until the `tracks` table is seeded.
// Each track must have at least one category from CATEGORIES and a type.
const FALLBACK: Track[] = [
  {
    id: "1",
    title: "Goodness of God (Live)",
    speaker: "Bethel Music",
    categories: ["Praise", "Worship"],
    type: "video",
    youtubeId: "n0FBb6hnwTo",
    thumb: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600",
  },
  {
    id: "2",
    title: "Stillness in His Presence",
    speaker: "Soaking Worship",
    categories: ["Worship"],
    type: "video",
    youtubeId: "yPwyTzajGtg",
    thumb: "https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=600",
  },
  {
    id: "3",
    title: "The Lord's Prayer",
    speaker: "Hillsong",
    categories: ["Worship"],
    type: "video",
    youtubeId: "ngEzZLnnk2A",
    thumb: "https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?w=600",
  },
  {
    id: "4",
    title: "Walking by Faith",
    speaker: "Daily Devotional",
    categories: ["Preaching"],
    type: "video",
    youtubeId: "Q2DJ6CGcr3I",
    thumb: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600",
  },
  {
    id: "5",
    title: "Way Maker",
    speaker: "Leeland",
    categories: ["Praise", "Worship"],
    type: "video",
    youtubeId: "29IxnsqOkmQ",
    thumb: "https://images.unsplash.com/photo-1504333638930-c8787321eee0?w=600",
  },
  {
    id: "6",
    title: "Quiet the Noise",
    speaker: "Reflection",
    categories: ["Worship"],
    type: "video",
    youtubeId: "qWv8FBjLZ7Y",
    thumb: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=600",
  },
];

function Listen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const { profile } = useAuth();
  const { play } = useAudioPlayer();
  const railTitle = pickListenRailTitle(profile);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handlePlay(track: Track) {
    if (track.type === "audio" && track.audioUrl && !track.audioUrl.startsWith("http")) {
      // audioUrl is a storage path — resolve a signed URL before playing
      setLoadingId(track.id);
      try {
        const { signedUrl } = await getSignedAudioUrl({ data: { path: track.audioUrl } });
        play({ ...track, audioUrl: signedUrl });
      } finally {
        setLoadingId(null);
      }
    } else {
      play(track);
    }
  }

  const { data } = useQuery({
    queryKey: ["tracks"],
    queryFn: () => getTracks(),
    staleTime: 5 * 60 * 1000,
  });

  const media: Track[] = (data?.tracks ?? []).length
    ? data!.tracks.map((t) => ({
        id: t.id,
        title: t.title,
        speaker: t.speaker,
        categories: t.categories ?? ["Worship"],
        type: t.type ?? "video",
        youtubeId: t.youtube_id ?? undefined,
        audioUrl: t.audio_url ?? undefined,
        thumb: t.thumb,
      }))
    : FALLBACK;

  const filtered = media.filter((m) => {
    const matchesCategory =
      activeCategory === "All" || m.categories.includes(activeCategory);
    const matchesType =
      activeType === "All" || m.type === activeType.toLowerCase();
    return matchesCategory && matchesType;
  });

  return (
    <>
      <NatureBackground />
      <section className="max-w-6xl mx-auto px-4 md:px-8 md:pt-10" style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}>
        {/* Header */}
        <div className="mb-8 fade-up">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70 mb-2">
            {railTitle}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white leading-tight max-w-2xl">
            Soundscapes for a held heart.
          </h1>
          <p className="text-white/75 mt-2 max-w-xl flex items-center gap-2">
            <Icon icon={Headphones} size="sm" tone="hue" /> Worship, prayer, and teaching to walk with you.
          </p>
        </div>

        {/* Type filter */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mb-2">Type</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-4 py-1.5 rounded-full text-sm shrink-0 transition border ${
                  activeType === t
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-white/8 text-white/80 border-white/15 hover:bg-white/12"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mb-2">Category</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-4 py-1.5 rounded-full text-sm shrink-0 transition border ${
                  activeCategory === c
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-white/8 text-white/80 border-white/15 hover:bg-white/12"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Track grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/60">
            <p className="font-display text-2xl mb-2">Nothing here yet.</p>
            <p className="text-sm">Try a different category or type.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-32">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => handlePlay(m)}
                disabled={loadingId === m.id}
                className="glass-on-hue rounded-2xl overflow-hidden text-left group hover:scale-[1.01] transition disabled:opacity-70 disabled:cursor-wait"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${m.thumb})` }}
                >
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition" />
                </div>
                {/* Info */}
                <div className="p-3 flex items-start gap-2.5">
                  <span className="mt-0.5 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                    {loadingId === m.id
                      ? <Icon icon={Loader2} size="sm" tone="active" className="animate-spin" />
                      : <Icon icon={m.type === "audio" ? Headphones : Play} size="sm" tone="active" />
                    }
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-white/60 mb-0.5">
                      {m.categories.join(" · ")}
                    </div>
                    <h3 className="font-semibold text-sm leading-snug text-white truncate">{m.title}</h3>
                    <p className="text-xs text-white/65 mt-0.5 truncate">{m.speaker}</p>
                  </div>
                </div>
              </button>
            ))}

          </div>
        )}
      </section>
      {/* The expanded player overlay is handled globally by <PlayerDock> in <AppShell> */}
    </>
  );
}
