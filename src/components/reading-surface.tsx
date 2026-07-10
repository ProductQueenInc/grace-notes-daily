import { cn } from "@/lib/utils";

/**
 * Parchment glass surface used INSIDE content readers (devotionals, long-form
 * scripture, expanded heart notes). Not for navigation chrome.
 */
export function ReadingSurface({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("glass-parchment rounded-3xl", className)} style={style}>
      {children}
    </div>
  );
}
