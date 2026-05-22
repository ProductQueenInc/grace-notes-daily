import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { NatureBackground } from "@/components/nature-background";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Headphones, Play, X } from "lucide-react";
import { useAudioPlayer, type Track } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { pickListenRailTitle } from "@/lib/personalization";
import { useAuth } from "@/hooks/use-auth";
import { getTracks } from "@/lib/tracks.functions";

export const Route = createFileRoute("/listen")({
  head: () => ({ meta: [{ title: "Listen — GraceNotes Daily" }] }),
  component: () => <RequireAuth><AppShell><Listen /></AppShell></RequireAuth>,
});

const THEMES = ["All", "Worship", "Prayer", "Teaching", "Rest"];

// Fallback curated list — used until the `tracks` table is seeded.
const FALLBACK: Track[] = [
  { id: "1", title: "Goodness of God (Live)", speaker: "Bethel Music", theme: "Worship", youtubeId: "n0FBb6hnwTo", thumb: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=600" },
  { id: "2", title: "Stillness in His Presence", speaker: "Soaking Worship", theme: "Rest", youtubeId: "yPwyTzajGtg", thumb: "https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=600" },
  { id: "3", title: "The Lord's Prayer", speaker: "Hillsong", theme: "Prayer", youtubeId: "ngEzZLnnk2A", thumb: "https://images.unsplash.com/photo-1508873696983-2dfd5898f08b?w=600" },
  { id: "4", title: "Walking by Faith", speaker: "Daily Devotional", theme: "Teaching", youtubeId: "Q2DJ6CGcr3I", thumb: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600" },
  { id: "5", title: "Way Maker", speaker: "Leeland", theme: "Worship", youtubeId: "29IxnsqOkmQ", thumb: "https://images.unsplash.com/photo-1504333638930-c8787321eee0?w=600" },
  { id: "6", title: "Quiet the Noise", speaker: "Reflection", theme: "Rest", youtubeId: "qWv8FBjLZ7Y", thumb: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=600" },
];

function Listen() {
  const [theme, setTheme] = useState("All");
  const { profile } = useAuth();
  const { play, track, expanded, setExpanded } = useAudioPlayer();
  const railTitle = pickListenRailTitle(profile);

  const filtered = theme === "All" ? MEDIA : MEDIA.filter((m) => m.theme === theme);

  return (
    <>
      <NatureBackground />
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6 md:pt-10">
        <div className="mb-8 fade-up">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/70 mb-2">{railTitle}</p>
          <h1 className="font-display text-4xl md:text-5xl text-white leading-tight max-w-2xl">
            Soundscapes for a held heart.
          </h1>
          <p className="text-white/75 mt-2 max-w-xl flex items-center gap-2">
            <Icon icon={Headphones} size="sm" tone="hue" /> Worship, prayer, and teaching to walk with you.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-1.5 rounded-full text-sm shrink-0 transition border ${
                theme === t
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-white/8 text-white/80 border-white/15 hover:bg-white/12"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => play(m)}
              className="glass-on-hue rounded-2xl overflow-hidden text-left group hover:scale-[1.01] transition"
            >
              <div className="relative aspect-video bg-cover bg-center" style={{ backgroundImage: `url(${m.thumb})` }}>
                <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition flex items-center justify-center">
                  <span className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center">
                    <Icon icon={Play} size="md" className="text-grace ml-0.5" tone="inherit" />
                  </span>
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-wider text-gold inline-block">{m.theme}</div>
                <h3 className="font-semibold text-sm leading-snug text-white mt-0.5">{m.title}</h3>
                <p className="text-xs text-white/65">{m.speaker}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Full player overlay (expanded state of the global player) */}
      {track && expanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl glass-on-hue rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-semibold text-white">{track.title}</p>
                <p className="text-xs text-white/70">{track.speaker} · {track.theme}</p>
              </div>
              <button onClick={() => setExpanded(false)} className="text-white/80" aria-label="Minimize">
                <Icon icon={X} size="md" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              {track.youtubeId && (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${track.youtubeId}?autoplay=1`}
                  title={track.title}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
