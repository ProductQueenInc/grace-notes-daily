import type { LucideIcon } from "lucide-react";
import { Icon } from "@/components/icon";

/**
 * Glass title card used on every authenticated page over the green-haze
 * background. White text by default for legibility on hue.
 */
export function PageHeader({
  icon,
  eyebrow,
  title,
  subtitle,
  children,
  align = "left",
}: {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  align?: "center" | "left";
}) {
  const alignCls = align === "center" ? "text-center items-center" : "text-left items-start";
  return (
    <div className={`glass-on-hue rounded-3xl px-5 sm:px-6 md:px-8 py-5 sm:py-6 md:py-7 mb-6 flex flex-col ${alignCls} gap-2 fade-up`}>
      {icon && (
        <span className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
          <Icon icon={icon} size="md" tone="hue" />
        </span>
      )}
      {eyebrow && (
        <span className="text-[11px] uppercase tracking-[0.22em] text-white/75 font-semibold">
          {eyebrow}
        </span>
      )}
      <h1 className="font-display text-3xl md:text-5xl text-white leading-tight tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm md:text-base text-white/80 max-w-2xl">{subtitle}</p>}
      {children && <div className="mt-2 w-full">{children}</div>}
    </div>
  );
}
