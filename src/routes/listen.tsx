import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Play, Loader2 } from "lucide-react";
import { useAudioPlayer, type Track } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { pickListenRailTitle } from "@/lib/personalization";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { getSignedAudioUrl } from "@/lib/listen-audio.functions";

export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Listen /></AppShell></RequireAuth>,
});

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
        const { url, error } = await getSignedAudioUrl({ data: { path: track.audioUrl } });
        if (error || !url) throw new Error(error ?? "Could not load audio");
        play({ ...track, audioUrl: url });
      } finally {
        setLoadingId(null);
      }
    } else {
      play(track);
    }
  }

  const { data } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id,title,speaker,categories,type,youtube_id,audio_url,thumb")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const media: Track[] = (data ?? []).map((t) => ({
    id: t.id as string,
    title: t.title as string,
    speaker: t.speaker as string,
    categories: (t.categories as string[] | null) ?? ["Worship"],
    type: ((t.type as "video" | "audio" | null) ?? "audio"),
    youtubeId: (t.youtube_id as string | null) ?? undefined,
    audioUrl: (t.audio_url as string | null) ?? undefined,
    thumb: t.thumb as string,
  }));

  // Derive category tags dynamically from loaded tracks — always matches
  // exactly what's in the library; new folders appear automatically.
  const categories = useMemo(() => {
    const seen = new Set<string>();
    media.forEach((m) => m.categories.forEach((c) => seen.add(c)));
    return ["All", ...Array.from(seen).sort()];
  }, [media]);

  const filtered = media.filter((m) => {
    const matchesCategory = activeCategory === "All" || m.categories.includes(activeCategory);
    const matchesType = activeType === "All" || m.type === activeType.toLowerCase();
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["All", "Audio", "Video"].map((t) => (
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

        {/* Category filter — derived from live track data */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
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
            <p className="text-sm">Try a different category.</p>
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
