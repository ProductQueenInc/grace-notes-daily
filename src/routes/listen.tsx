import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { FEATURES } from "@/lib/feature-flags";


export const Route = createFileRoute("/listen")({
  // Fully unreachable while FEATURES.listen is off — runs on every match
  // (nav click, bookmark, or typed URL), not just when linked from the app.
  beforeLoad: () => {
    if (!FEATURES.listen) {
      throw redirect({ to: "/home" });
    }
  },
  head: () => ({ meta: [{ title: "Listen - GraceNotes Daily" }] }),
  beforeLoad: () => {
    if (!FEATURES.listen) {
      throw redirect({ to: "/home" });
    }
  },
  component: () => <RequireAuth><AppShell><Listen /></AppShell></RequireAuth>,
});

function Listen() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const { profile } = useAuth();
  const { play, toggle, track: currentTrack, isPlaying } = useAudioPlayer();
  const railTitle = pickListenRailTitle(profile);
  const loadingId: string | null = null;

  const { data } = useQuery({
    queryKey: ["tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id,title,speaker,categories,type,youtube_id,audio_url,thumb,sort_order")
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

  const rawTracks: Track[] = (data?.tracks ?? []).length
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

  const privatePaths = rawTracks
    .filter((t) => t.type === "audio" && t.audioUrl && !t.audioUrl.startsWith("http"))
    .map((t) => t.audioUrl!);
  const pathsKey = privatePaths.join("|");

  const { data: signedMap } = useQuery({
    queryKey: ["tracks-signed", pathsKey],
    enabled: privatePaths.length > 0,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("listen-audio")
        .createSignedUrls(privatePaths, 3600);
      if (error) {
        console.error("createSignedUrls failed:", error.message);
        return {} as Record<string, string>;
      }
      const map: Record<string, string> = {};
      for (const r of data ?? []) {
        if (r.path && r.signedUrl) map[r.path] = r.signedUrl;
      }
      return map;
    },
  });

  const media: Track[] = rawTracks.map((t) =>
    t.type === "audio" && t.audioUrl && !t.audioUrl.startsWith("http") && signedMap?.[t.audioUrl]
      ? { ...t, audioUrl: signedMap[t.audioUrl] }
      : t,
  );

  // Type-filtered base (Audio / Video / All)
  const byType = media.filter(
    (m) => activeType === "All" || m.type === activeType.toLowerCase(),
  );

  // All categories present in current type-filtered data
  const categories = useMemo(() => {
    const seen = new Set<string>();
    byType.forEach((m) => m.categories.forEach((c) => seen.add(c)));
    return ["All", ...Array.from(seen).sort()];
  }, [byType]);

  // Featured = top 3 by sort order (already sorted)
  const featured = byType.slice(0, 3);

  // Visible groups based on active category
  const groups: { name: string; items: Track[] }[] = useMemo(() => {
    if (activeCategory !== "All") {
      return [
        {
          name: activeCategory,
          items: byType.filter((m) => m.categories.includes(activeCategory)),
        },
      ];
    }
    const map = new Map<string, Track[]>();
    byType.forEach((m) =>
      m.categories.forEach((c) => {
        if (!map.has(c)) map.set(c, []);
        map.get(c)!.push(m);
      }),
    );
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, items]) => ({ name, items }));
  }, [byType, activeCategory]);

  // Queue passed to player = the full type-filtered set so shuffle/next stays musical
  function handlePlay(track: Track) {
    if (currentTrack?.id === track.id) {
      toggle();
      return;
    }
    play(track, byType);
  }

  return (
    <>
      <NatureBackground />
      <section
        className="max-w-6xl mx-auto px-4 md:px-8 md:pt-10"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 3.5rem, 4rem)" }}
      >
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

        {/* Category filter */}
        <div className="mb-8">
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

        {/* Featured rail — only on the "All" view */}
        {activeCategory === "All" && featured.length > 0 && (
          <div className="mb-10">
            <SectionHeading title="Featured today" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featured.map((m) => (
                <FeaturedCard
                  key={m.id}
                  track={m}
                  isActive={currentTrack?.id === m.id}
                  isPlaying={currentTrack?.id === m.id && isPlaying}
                  onPlay={() => handlePlay(m)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Grouped tracks */}
        <div className="pb-32 space-y-10">
          {groups.length === 0 ? (
            <div className="text-center py-16 text-white/80">
              <p className="font-display text-2xl mb-2">Nothing here yet.</p>
              <p className="text-sm">Try a different filter.</p>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name}>
                <SectionHeading title={g.name} count={g.items.length} />
                {g.items.length === 0 ? (
                  <p className="text-white/70 text-sm">Nothing in this category yet.</p>
                ) : (
                  <>
                    {/* Mobile: snap-scrolling row */}
                    <div className="sm:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {g.items.map((m) => (
                        <div key={m.id} className="min-w-[72vw] snap-start">
                          <TrackCard
                            track={m}
                            isActive={currentTrack?.id === m.id}
                            isPlaying={currentTrack?.id === m.id && isPlaying}
                            isLoading={loadingId === m.id}
                            onPlay={() => handlePlay(m)}
                          />
                        </div>
                      ))}
                    </div>
                    {/* Desktop / tablet: 3-up grid */}
                    <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4">
                      {g.items.map((m) => (
                        <TrackCard
                          key={m.id}
                          track={m}
                          isActive={currentTrack?.id === m.id}
                          isPlaying={currentTrack?.id === m.id && isPlaying}
                          isLoading={loadingId === m.id}
                          onPlay={() => handlePlay(m)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between mb-4">
      <h2 className="font-display text-2xl md:text-[1.7rem] text-white drop-shadow">
        {title}
      </h2>
      {typeof count === "number" && (
        <span className="text-white/70 text-xs uppercase tracking-wider">
          {count} {count === 1 ? "track" : "tracks"}
        </span>
      )}
    </div>
  );
}

function FeaturedCard({
  track,
  isActive,
  isPlaying,
  onPlay,
}: {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      className={`relative aspect-video rounded-2xl overflow-hidden text-left group transition shadow-lg ${
        isActive ? "ring-2 ring-gold shadow-gold/20" : ""
      }`}
      style={{ backgroundImage: `url(${track.thumb})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 transition group-hover:from-black/85" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition ${
            isPlaying ? "bg-gold text-white" : "bg-white/95 text-[var(--grace-deep)] scale-90 group-hover:scale-100"
          }`}
        >
          {isPlaying
            ? <Pause className="w-6 h-6" fill="currentColor" />
            : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
        </span>
      </div>
      <div className="absolute left-0 right-0 bottom-0 p-4 text-white">
        <div className="text-[10px] uppercase tracking-wider text-white/80 mb-1">
          {track.categories.join(" · ")}
        </div>
        <h3 className="font-display text-lg leading-tight">{track.title}</h3>
        <p className="text-xs text-white/80 mt-0.5 truncate">{track.speaker}</p>
      </div>
    </button>
  );
}

function TrackCard({
  track,
  isActive,
  isPlaying,
  isLoading,
  onPlay,
}: {
  track: Track;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      onClick={onPlay}
      disabled={isLoading}
      aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
      className={`glass-on-hue rounded-2xl overflow-hidden text-left group hover:scale-[1.01] transition disabled:cursor-wait w-full ${
        isActive ? "ring-2 ring-gold shadow-lg shadow-gold/20" : ""
      }`}
    >
      <div
        className="relative aspect-video bg-cover bg-center"
        style={{ backgroundImage: `url(${track.thumb})` }}
      >
        <div className={`absolute inset-0 transition ${isActive ? "bg-black/40" : "bg-black/10 group-hover:bg-black/20"}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition ${
              isPlaying
                ? "bg-gold text-white scale-100"
                : isActive
                  ? "bg-white text-[var(--grace-deep)] scale-100"
                  : "bg-white/90 text-[var(--grace-deep)] scale-90 group-hover:scale-100"
            }`}
          >
            {isLoading
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : isPlaying
                ? <Pause className="w-5 h-5" fill="currentColor" />
                : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
          </span>
        </div>
        {isActive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] uppercase tracking-wider font-semibold">
            <PlayingBars playing={isPlaying} className="text-gold" />
            {isPlaying ? "Playing" : "Paused"}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-white/80 mb-0.5">
          {track.categories.join(" · ")}
        </div>
        <h3 className="font-semibold text-sm leading-snug text-white truncate">{track.title}</h3>
        <p className="text-xs text-white/80 mt-0.5 truncate">{track.speaker}</p>
      </div>
    </button>
  );
}
