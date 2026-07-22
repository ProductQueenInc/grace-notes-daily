import doveWhiteAsset from "@/assets/dove-white-transparent.svg.asset.json";
import doveGoldAsset from "@/assets/dove-gold-transparent.svg.asset.json";
import doveGreenAsset from "@/assets/dove-green-transparent.svg.asset.json";
import doveGreenRound from "@/assets/round-transparent-green-dove.png";
import doveMedallion from "@/assets/dove-medallion.png";

type Variant = "white" | "gold" | "green" | "green-round" | "medallion";

const SRC: Record<Variant, string> = {
  white: doveWhiteAsset.url,
  gold: doveGoldAsset.url,
  green: doveGreenAsset.url,
  "green-round": doveGreenRound,
  medallion: doveMedallion,
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
