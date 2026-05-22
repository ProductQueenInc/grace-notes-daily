import { create } from "zustand";

export type Track = {
  id: string;
  title: string;
  speaker: string;
  theme: string;
  /** YouTube id or audio URL */
  youtubeId?: string;
  audioUrl?: string;
  thumb: string;
};

type AudioState = {
  track: Track | null;
  isPlaying: boolean;
  /** Whether the full-screen player is open (vs. just the mini dock) */
  expanded: boolean;
  play: (track: Track) => void;
  toggle: () => void;
  setExpanded: (v: boolean) => void;
  close: () => void;
};

export const useAudioPlayer = create<AudioState>((set) => ({
  track: null,
  isPlaying: false,
  expanded: false,
  play: (track) => set({ track, isPlaying: true, expanded: true }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setExpanded: (expanded) => set({ expanded }),
  close: () => set({ track: null, isPlaying: false, expanded: false }),
}));
