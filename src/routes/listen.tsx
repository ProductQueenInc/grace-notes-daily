import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Play, Pause, Loader2 } from "lucide-react";
import { useAudioPlayer, type Track } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { PlayingBars } from "@/components/playing-bars";
import { pickListenRailTitle } from "@/lib/personalization";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";


export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen - GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Listen /></AppShell></RequireAuth>,
});

function Listen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const { profile } = useAuth();
  const { play, toggle, track: currentTrack, isPlaying } = useAudioPlayer();
  const railTitle = pickListenRailTitle(profile);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handlePlay(track: Track) {
    // If this is already the loaded track, just toggle pause/play.
    if (currentTrack?.id === track.id) {
      toggle();
      return;
    }
    if (track.type === "audio" && track.audioUrl && !track.audioUrl.startsWith("http")) {
      setLoadingId(track.id);
      try {
        const { data, error } = await supabase
          .storage
          .from("listen-audio")
          .createSignedUrl(track.audioUrl, 3600);
        if (error || !data?.signedUrl) {
          console.error("createSignedUrl failed:", error?.message);
          throw new Error(error?.message ?? "Could not load audio");
        }
        play({ ...track, audioUrl: data.signedUrl });
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
      if (error) {
        console.error("tracks query failed:", error.message);
        return { tracks: [] as Array<Record<string, unknown>> };
      }
      return { tracks: (data ?? []) as Array<Record<string, unknown>> };
    },
    staleTime: 5 * 60 * 1000,
  });

  const media: Track[] = (data?.tracks ?? []).length
    ? data!.tracks.map((t: Record<string, unknown>) => ({
        id: String(t.id),
        title: String(t.title),
        speaker: String(t.speaker ?? ""),
        categories: (t.categories as string[] | null) ?? ["Worship"],
        type: (t.type as "audio" | "video" | null) ?? "audio",
        youtubeId: (t.youtube_id as string | null) ?? undefined,
        audioUrl: (t.audio_url as string | null) ?? undefined,
        thumb: String(t.thumb ?? ""),
      }))
    : [];


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
          <p className="inline-block text-[11px] uppercase tracking-[0.22em] text-white font-semibold mb-2 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-sm">
            {railTitle}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-white leading-tight max-w-2xl">
            Soundscapes for a held heart.
          </h1>
          <p className="text-white/85 mt-2 max-w-xl flex items-center gap-2">
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition border ${
                  activeType === t
                    ? "bg-white text-[var(--grace-deep)] border-white shadow-sm"
                    : "bg-black/35 text-white border-white/30 hover:bg-black/45 backdrop-blur-sm"
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
                className={`px-4 py-1.5 rounded-full text-sm font-medium shrink-0 transition border ${
                  activeCategory === c
                    ? "bg-white text-[var(--grace-deep)] border-white shadow-sm"
                    : "bg-black/35 text-white border-white/30 hover:bg-black/45 backdrop-blur-sm"
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
            {filtered.map((m) => {
              const isActive = currentTrack?.id === m.id;
              const isThisPlaying = isActive && isPlaying;
              const isLoading = loadingId === m.id;
              return (
              <button
                key={m.id}
                onClick={() => handlePlay(m)}
                disabled={isLoading}
                aria-label={isThisPlaying ? `Pause ${m.title}` : `Play ${m.title}`}
                className={`glass-on-hue rounded-2xl overflow-hidden text-left group hover:scale-[1.01] transition disabled:cursor-wait ${
                  isActive ? "ring-2 ring-gold shadow-lg shadow-gold/20" : ""
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video bg-cover bg-center"
                  style={{ backgroundImage: `url(${m.thumb})` }}
                >
                  <div className={`absolute inset-0 transition ${isActive ? "bg-black/40" : "bg-black/10 group-hover:bg-black/20"}`} />
                  {/* Play / Pause overlay button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition ${
                        isThisPlaying
                          ? "bg-gold text-white scale-100"
                          : isActive
                            ? "bg-white text-[var(--grace-deep)] scale-100"
                            : "bg-white/90 text-[var(--grace-deep)] scale-90 group-hover:scale-100"
                      }`}
                    >
                      {isLoading
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : isThisPlaying
                          ? <Pause className="w-5 h-5" fill="currentColor" />
                          : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
                    </span>
                  </div>
                  {/* Now-playing badge */}
                  {isActive && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] uppercase tracking-wider font-semibold">
                      <PlayingBars playing={isThisPlaying} className="text-gold" />
                      {isThisPlaying ? "Playing" : "Paused"}
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3 flex items-start gap-2.5">
                  <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive ? "bg-gold/25" : "bg-white/15"}`}>
                    {isActive
                      ? <PlayingBars playing={isThisPlaying} className="text-gold" />
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
              );
            })}
          </div>
        )}
      </section>
      {/* The expanded player overlay is handled globally by <PlayerDock> in <AppShell> */}
    </>
  );
}
