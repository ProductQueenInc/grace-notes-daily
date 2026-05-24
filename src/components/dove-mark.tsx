import doveWhite from "@/assets/dove-white.png";
import doveGold from "@/assets/dove-gold.png";
import doveGreen from "@/assets/dove-green.png";

type Variant = "white" | "gold" | "green";

const SRC: Record<Variant, string> = {
  white: doveWhite,
  gold: doveGold,
  green: doveGreen,
};

interface DoveMarkProps {
  variant?: Variant;
  className?: string;
  alt?: string;
}

/**
 * GraceNotes Daily brand mark — a dove with an olive branch.
 * Three transparent PNG variants for use throughout the app:
 *   - "white" on dark / green surfaces (default for brand wordmark)
 *   - "gold"  on cream / parchment surfaces, or for celebratory accents
 *   - "green" on white / light surfaces
 */
export function DoveMark({ variant = "white", className = "w-5 h-5", alt = "" }: DoveMarkProps) {
  return <img src={SRC[variant]} alt={alt} className={`${className} object-contain`} draggable={false} />;
}
