import { Link } from "@tanstack/react-router";
import { Sun } from "lucide-react";
import { Icon } from "@/components/icon";
import { DoveMark } from "@/components/dove-mark";

/**
 * Pill button used in page headers when the user is signed in.
 * Mirrors the mobile bottom-nav Home tab (Sun icon).
 */
export function BackHomeButton({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/home"
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace shadow ${className}`}
    >
      <Icon icon={Sun} size="sm" tone="inherit" />
      Back Home
    </Link>
  );
}


/**
 * Bottom-of-page CTA card for signed-in readers.
 * variant="article" speaks to Notes & Letters readers;
 * variant="guide" speaks to readers of the standalone guides / landing pages.
 */
export function BackHomeCard({
  variant = "article",
}: {
  variant?: "article" | "guide";
}) {
  const isArticle = variant === "article";
  return (
    <div className="glass-on-hue rounded-2xl p-8 text-center">
      <DoveMark variant="medallion" className="w-14 h-14 mx-auto mb-4" />
      <h3 className="font-display text-2xl text-white mb-3">
        {isArticle ? "Carry this back with you." : "Practice it in your space."}
      </h3>
      <p className="text-white/75 mb-6 text-sm leading-relaxed max-w-md mx-auto">
        {isArticle
          ? "Your prayer list, today's Grace Note, and your Heart Notes are waiting. Bring what stirred in you here into the quiet space you have been keeping."
          : "Open GraceNotes Daily to put this into rhythm. Your prayer list, devotional, and journal are one tap away."}
      </p>
      <Link
        to="/home"
        className="inline-flex items-center gap-1.5 px-8 py-3 rounded-full bg-gold text-gold-foreground font-semibold hover:bg-gold/90 transition"
      >
        <Icon icon={Sun} size="sm" tone="inherit" />
        Back Home
      </Link>
    </div>
  );
}
