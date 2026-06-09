type Props = {
  playing?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Animated equalizer bars to indicate the currently playing track.
 * Pauses (and stops animating) when `playing` is false.
 */
export function PlayingBars({ playing = true, size = "sm", className = "" }: Props) {
  const barW = size === "sm" ? "w-[3px]" : "w-1";
  const h = size === "sm" ? "h-3" : "h-4";
  return (
    <span
      aria-label={playing ? "Now playing" : "Paused"}
      className={`inline-flex items-end gap-[2px] ${h} ${playing ? "" : "eq-paused"} ${className}`}
    >
      <span className={`eq-bar ${barW} h-full bg-current rounded-sm`} />
      <span className={`eq-bar ${barW} h-full bg-current rounded-sm`} />
      <span className={`eq-bar ${barW} h-full bg-current rounded-sm`} />
      <span className={`eq-bar ${barW} h-full bg-current rounded-sm`} />
    </span>
  );
}
