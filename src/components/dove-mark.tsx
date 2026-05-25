import doveWhite from "@/assets/transparent-white-dove.png";
import doveGold from "@/assets/transparent-gold-dove.png";
import doveGreen from "@/assets/transparent-green-dove.png";
import doveGreenRound from "@/assets/round-transparent-green-dove.png";

type Variant = "white" | "gold" | "green" | "green-round";

const SRC: Record<Variant, string> = {
  white: doveWhite,
  gold: doveGold,
  green: doveGreen,
  "green-round": doveGreenRound,
};

interface DoveMarkProps {
  variant?: Variant;
  className?: string;
  alt?: string;
}

/**
 * GraceNotes Daily brand mark — a dove with an olive branch.
 * Variants:
 *   - "white"        on dark / green surfaces (default for brand wordmark)
 *   - "gold"         celebratory accent on dark surfaces
 *   - "green"        on light / parchment surfaces
 *   - "green-round"  circle-bordered tile (icon chip)
 */
export function DoveMark({ variant = "white", className = "w-5 h-5", alt = "" }: DoveMarkProps) {
  return (
    <img
      src={SRC[variant]}
      alt={alt}
      className={`${className} object-contain select-none`}
      draggable={false}
    />
  );
}
