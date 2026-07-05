import { useQuery } from "@tanstack/react-query";
import { generateShareCard, type ShareContext } from "@/lib/share";

function keyFor(ctx: ShareContext): (string | number)[] {
  switch (ctx.type) {
    case "grace_note":
      return ["share-card", ctx.type, ctx.note_id];
    case "devotional":
      return ["share-card", ctx.type, ctx.date];
    case "answered_prayer":
      return ["share-card", ctx.type, ctx.prayer_id];
    case "milestone":
      return ["share-card", ctx.type, ctx.tier];
  }
}

/**
 * Fetches (mocked) share-card image + caption + deep link. Enabled only
 * once the modal is open so the network call and skeleton align 1:1.
 */
export function useShareCard(ctx: ShareContext | null, enabled: boolean) {
  return useQuery({
    queryKey: ctx ? keyFor(ctx) : ["share-card", "idle"],
    queryFn: () => generateShareCard(ctx!),
    enabled: !!ctx && enabled,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}
