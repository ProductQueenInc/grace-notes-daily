import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type DBTrack = {
  id: string;
  title: string;
  speaker: string;
  /** Array of category strings, e.g. ["Praise", "Worship"] */
  categories: string[] | null;
  /** "video" for YouTube content, "audio" for uploaded audio files */
  type: "video" | "audio" | null;
  youtube_id: string | null;
  audio_url: string | null;
  thumb: string;
};

export const getTracks = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  // Use service role key so the query bypasses RLS — tracks are public
  // catalogue content, the same for every authenticated user.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return { tracks: [] as DBTrack[] };

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from("tracks")
    .select("id,title,speaker,categories,type,youtube_id,audio_url,thumb")
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getTracks error:", error.message);
    return { tracks: [] as DBTrack[] };
  }
  return { tracks: (data ?? []) as DBTrack[] };
});
