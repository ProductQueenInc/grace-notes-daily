import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  speaker: string;
  /** One or more of: "Praise" | "Worship" | "Preaching" | "Podcast" */
  categories: string[];
  /** Whether this is a video or audio-only track */
  type: "video" | "audio";
  /** YouTube video id (when type === "video") */
  youtubeId?: string;
  /** URL to audio file (when type === "audio") */
  audioUrl?: string;
  thumb: string;
};

type AudioState = {
  track: Track | null;
  /** Ordered list of tracks for the current playback session */
  queue: Track[];
  shuffled: boolean;
  isPlaying: boolean;
  /** Whether the full-screen player is open (vs. just the mini dock) */
  expanded: boolean;
  /** Play a track. Pass queue to set the session playlist at the same time. */
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
  close: () => void;
  playNext: () => void;
  toggleShuffle: () => void;
};

export const useAudioPlayer = create<AudioState>((set, get) => ({
  track: null,
  queue: [],
  shuffled: false,
  isPlaying: false,
  expanded: false,

  play: (track, queue) =>
    set((s) => ({
      track,
      isPlaying: true,
      expanded: true,
      queue: queue ?? s.queue,
    })),

  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setExpanded: (expanded) => set({ expanded }),
  close: () => set({ track: null, isPlaying: false, expanded: false, queue: [] }),

  playNext: () => {
    const { track, queue, shuffled } = get();
    if (queue.length <= 1) return;
    if (shuffled) {
      const others = queue.filter((t) => t.id !== track?.id);
      const next = others[Math.floor(Math.random() * others.length)];
      set({ track: next, isPlaying: true });
    } else {
      const idx = queue.findIndex((t) => t.id === track?.id);
      const next = queue[(idx + 1) % queue.length];
      set({ track: next, isPlaying: true });
    }
  },

  toggleShuffle: () => set((s) => ({ shuffled: !s.shuffled })),
}));
