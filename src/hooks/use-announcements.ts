import { useEffect, useState, useCallback } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  severity: "info" | "success" | "warning" | "critical";
  link_url: string | null;
  link_label: string | null;
};

/** Loads the most recent active announcement the current user hasn't dismissed. */
export function useActiveAnnouncement() {
  const { user } = useAuth();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabaseConfigured || !user) {
      setItem(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: dismissed } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", user.id);
    const dismissedIds = (dismissed ?? []).map((d) => d.announcement_id);

    let q = supabase
      .from("system_announcements")
      .select("id, title, body, severity, link_url, link_label")
      .order("publish_at", { ascending: false })
      .limit(1);
    if (dismissedIds.length) q = q.not("id", "in", `(${dismissedIds.join(",")})`);

    const { data } = await q.maybeSingle();
    setItem((data as Announcement | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const dismiss = useCallback(async () => {
    if (!user || !item) return;
    const id = item.id;
    setItem(null);
    await supabase
      .from("announcement_dismissals")
      .insert({ user_id: user.id, announcement_id: id });
  }, [user, item]);

  return { announcement: item, loading, dismiss, reload: load };
}
