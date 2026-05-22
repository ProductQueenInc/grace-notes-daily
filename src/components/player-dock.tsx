import { useAudioPlayer } from "@/hooks/use-audio-player";
import { Icon } from "@/components/icon";
import { Pause, Play, X, ChevronUp } from "lucide-react";

/**
 * Mini player that floats above the main content whenever a track is active.
 * Tapping the title / cover expands to the full Listen overlay.
 */
export function PlayerDock() {
  const { track, isPlaying, toggle, close, setExpanded, expanded } = useAudioPlayer();
  if (!track || expanded) return null;

  return (
    <div className="fixed z-40 left-3 right-3 bottom-20 md:bottom-4 md:left-auto md:right-6 md:w-[360px] animate-slide-up pointer-events-auto">
      <div className="glass-on-hue rounded-2xl overflow-hidden flex items-center gap-3 p-2">
        {/* Thin progress hint (decorative until backend wires time) */}
        <span className="absolute top-0 left-0 h-0.5 w-1/3 bg-gold/80" />
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-label="Open player"
        >
          <span
            className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0"
            style={{ backgroundImage: `url(${track.thumb})` }}
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white truncate">{track.title}</span>
            <span className="block text-[11px] text-white/70 truncate">
              {track.speaker} · {track.theme}
            </span>
          </span>
          <Icon icon={ChevronUp} size="sm" className="text-white/60 shrink-0" />
        </button>
        <button
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <Icon icon={isPlaying ? Pause : Play} size="sm" tone="inherit" />
        </button>
        <button
          onClick={close}
          className="w-8 h-8 rounded-full hover:bg-white/15 text-white/70 flex items-center justify-center shrink-0"
          aria-label="Close player"
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>
    </div>
  );
}
