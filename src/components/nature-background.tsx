import { useEffect, useState } from "react";

/**
 * Forest-dawn / sunlit-field imagery, overlaid with a strong green radial haze
 * so authenticated screens feel like a single continuous space (Calm pattern).
 */
/**
 * IMAGE POLICY (locked):
 * Only soft, reverent natural imagery - forests, mountains, dawn light, mist,
 * still water, open fields. Absolutely NO alcohol, food, people's faces,
 * brands, urban scenes, or anything that could feel out of place in a
 * Christian devotional context. Vet every new URL before adding it.
 */
const IMAGES = [
  "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=70&auto=format&fit=crop", // sun-rays through forest
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=70&auto=format&fit=crop", // soft hills
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=70&auto=format&fit=crop", // tall forest, sun rays
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1920&q=70&auto=format&fit=crop", // misty forest path
  "https://images.unsplash.com/photo-1499002238440-d264edd596ec?w=1920&q=70&auto=format&fit=crop", // dawn mountain layers
];

export function NatureBackground({ overlay = true }: { overlay?: boolean }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * IMAGES.length));
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % IMAGES.length), 22000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-[2400ms] ease-in-out bg-cover bg-center"
          style={{ backgroundImage: `url(${src})`, opacity: i === idx ? 1 : 0 }}
        />
      ))}
      {overlay && (
        <>
          {/* Radial green haze - the "Calm" tint that holds the app together */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 30%, oklch(0.55 0.09 152 / 0.45) 0%, oklch(0.42 0.08 152 / 0.65) 45%, oklch(0.22 0.05 152 / 0.85) 100%)",
            }}
          />
          {/* Subtle vignette for legibility at edges */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />
        </>
      )}
    </div>
  );
}
