import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Unified icon wrapper. All app icons must be rendered through <Icon /> so we
 * keep stroke, size, and color tone consistent across every screen.
 *
 * Tones:
 *  - hue: white/85 (default on green-haze surfaces)
 *  - light: foreground tone (use inside parchment / light readers)
 *  - active: gold (selected nav items, accents)
 *  - inherit: pass-through; lets parent class control color
 */
type Tone = "hue" | "light" | "active" | "inherit";
type Size = "sm" | "md" | "nav";

export type IconProps = Omit<LucideProps, "ref" | "size"> & {
  icon: LucideIcon;
  tone?: Tone;
  size?: Size;
};

const sizeMap: Record<Size, number> = { sm: 16, md: 20, nav: 24 };
const toneClass: Record<Tone, string> = {
  hue: "text-white/85",
  light: "text-foreground/80",
  active: "text-gold",
  inherit: "",
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { icon: IconComponent, tone = "inherit", size = "md", className, ...rest },
  ref,
) {
  return (
    <IconComponent
      ref={ref}
      size={sizeMap[size]}
      strokeWidth={1.75}
      className={cn(toneClass[tone], className)}
      {...rest}
    />
  );
});
