import { Sparkles, BookHeart, HandHeart, Compass, Headphones, Play, Check, Flame } from "lucide-react";

/**
 * Mini product-flavoured preview cards for the marketing homepage.
 * Inspired by the Calm "everything-in-one-app" collage. Each card is built
 * from design tokens (glass surfaces + brand greens + gold) — no real
 * screenshots, no real user data.
 *
 * Layout strategy:
 *  - Mobile: two horizontally-scrolling rails (3 cards each), snap-scroll.
 *  - sm+    : 3-column grid with subtle vertical offsets (collage feel).
 *
 * Each card has a label strip across the bottom describing the surface
 * (e.g. "Grace Note · daily") so the value is clear at a glance.
 */

type PreviewProps = { className?: string };

function CardShell({
  children,
  label,
  icon: Icon,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  icon: typeof Sparkles;
  className?: string;
}) {
  return (
    <div
      className={[
        "relative rounded-3xl overflow-hidden shadow-xl ring-1 ring-white/40 bg-white/95",
        "h-72 sm:h-80 flex flex-col",
        className,
      ].join(" ")}
    >
      <div className="flex-1 p-5 overflow-hidden">{children}</div>
      <div className="px-5 py-3 border-t border-grace/10 bg-grace-haze/60 flex items-center gap-2">
        <span className="w-7 h-7 rounded-full bg-grace text-white flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5" strokeWidth={2} />
        </span>
        <span className="text-grace font-semibold text-sm">{label}</span>
      </div>
    </div>
  );
}

function GraceNotePreview({ className }: PreviewProps) {
  return (
    <CardShell label="Grace Note · daily" icon={Sparkles} className={className}>
      <div className="h-full rounded-2xl bg-gradient-to-br from-grace-haze to-white p-4 flex flex-col">
        <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-2">
          Today
        </p>
        <p className="font-display text-grace text-lg leading-snug">
          "Beloved, you do not have to earn this morning. It is already yours."
        </p>
        <p className="font-display text-grace-deep text-sm mt-auto italic">
          — Love, God
        </p>
      </div>
    </CardShell>
  );
}

function HeartNotesPreview({ className }: PreviewProps) {
  return (
    <CardShell label="Heart Notes · journal" icon={BookHeart} className={className}>
      <div className="h-full rounded-2xl bg-[#fdf8ee] p-4 flex flex-col gap-2 relative overflow-hidden">
        <div className="space-y-1.5">
          <div className="h-1.5 w-3/4 bg-grace/15 rounded-full" />
          <div className="h-1.5 w-5/6 bg-grace/15 rounded-full" />
          <div className="h-1.5 w-2/3 bg-grace/15 rounded-full" />
        </div>
        <div className="mt-3 ml-auto max-w-[80%] bg-grace text-white text-xs leading-relaxed rounded-2xl rounded-br-sm px-3 py-2 shadow-sm">
          I'm right here. Keep telling me everything.
        </div>
        <p className="text-[10px] text-foreground/50 mt-auto">a quiet reply, just for you</p>
      </div>
    </CardShell>
  );
}

function PrayerTrackerPreview({ className }: PreviewProps) {
  const prayers = [
    { text: "For Mum's healing", answered: true },
    { text: "Clarity on the new role", answered: false },
    { text: "Patience with Daniel", answered: false },
  ];
  return (
    <CardShell label="Prayer Tracker · answered" icon={HandHeart} className={className}>
      <div className="h-full rounded-2xl bg-gradient-to-br from-white to-grace-haze p-4 flex flex-col gap-2">
        {prayers.map((p) => (
          <div
            key={p.text}
            className="flex items-center gap-3 rounded-xl bg-white/80 px-3 py-2.5 ring-1 ring-grace/10"
          >
            <span
              className={[
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                p.answered ? "bg-gold" : "border-2 border-grace/30",
              ].join(" ")}
            >
              {p.answered && <Check className="w-3 h-3 text-grace-deep" strokeWidth={3} />}
            </span>
            <span
              className={[
                "text-sm",
                p.answered ? "text-grace line-through/0 font-semibold" : "text-foreground/75",
              ].join(" ")}
            >
              {p.text}
            </span>
            {p.answered && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gold">
                Answered
              </span>
            )}
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function YourJourneyPreview({ className }: PreviewProps) {
  // 5-week mini calendar with answered moments scattered
  const cells = Array.from({ length: 35 });
  const filled = new Set([3, 4, 5, 9, 10, 11, 12, 16, 17, 18, 19, 23, 24, 25, 26, 30, 31]);
  const gold = new Set([12, 19, 26]);
  return (
    <CardShell label="Your Journey · archive" icon={Compass} className={className}>
      <div className="h-full rounded-2xl bg-gradient-to-br from-grace-haze to-white p-4 flex flex-col">
        <p className="text-[10px] uppercase tracking-widest text-grace-deep font-bold mb-2">
          This month
        </p>
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {cells.map((_, i) => (
            <span
              key={i}
              className={[
                "rounded-md aspect-square",
                gold.has(i)
                  ? "bg-gold"
                  : filled.has(i)
                  ? "bg-grace/70"
                  : "bg-grace/10",
              ].join(" ")}
            />
          ))}
        </div>
        <p className="text-xs text-foreground/65 mt-3">
          <span className="font-bold text-grace">18 days</span> with God this month
        </p>
      </div>
    </CardShell>
  );
}

function ListenPreview({ className }: PreviewProps) {
  return (
    <CardShell label="Listen · worship + prayer" icon={Headphones} className={className}>
      <div className="h-full rounded-2xl bg-gradient-to-br from-grace-deep to-grace p-4 flex flex-col text-white">
        <p className="text-[10px] uppercase tracking-widest text-gold font-bold mb-1">
          Now playing
        </p>
        <p className="font-display text-xl leading-snug">Be Still, My Soul</p>
        <p className="text-xs text-white/70 mt-0.5">Evening worship · 6 min</p>
        <div className="flex items-end gap-0.5 h-10 mt-4">
          {[3, 6, 4, 8, 5, 9, 7, 10, 6, 8, 5, 7, 4, 6, 3, 5, 4, 6, 3].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-gold/80"
              style={{ height: `${h * 10}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-auto pt-3">
          <span className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-grace-deep shrink-0">
            <Play className="w-4 h-4 fill-current" />
          </span>
          <div className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full w-1/3 bg-gold" />
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function DailyRhythmsPreview({ className }: PreviewProps) {
  // Calendar snapshot + 3 check circles + "Gold day!" coin
  const cells = Array.from({ length: 28 });
  const done = new Set([0, 1, 2, 3, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23]);
  return (
    <CardShell label="Daily Rhythms · streak" icon={Flame} className={className}>
      <div className="h-full rounded-2xl bg-gradient-to-br from-white to-grace-haze p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-widest text-grace-deep font-bold">
            7-day rhythm
          </p>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
            Gold day
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {cells.map((_, i) => (
            <span
              key={i}
              className={[
                "rounded-sm aspect-square",
                done.has(i) ? "bg-grace" : "bg-grace/10",
              ].join(" ")}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-auto">
          {["Devotion", "Note", "Journal"].map((label) => (
            <div key={label} className="flex flex-col items-center gap-1 flex-1">
              <span className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                <Check className="w-4 h-4 text-grace-deep" strokeWidth={3} />
              </span>
              <span className="text-[10px] text-foreground/65 font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

const PREVIEWS = [
  <GraceNotePreview key="gn" />,
  <HeartNotesPreview key="hn" />,
  <PrayerTrackerPreview key="pt" />,
  <YourJourneyPreview key="yj" />,
  <ListenPreview key="ls" />,
  <DailyRhythmsPreview key="dr" />,
];

export function HomeFeaturePreviews() {
  return (
    <>
      {/* Mobile: two horizontal rails, snap scroll */}
      <div className="sm:hidden space-y-4">
        {[PREVIEWS.slice(0, 3), PREVIEWS.slice(3, 6)].map((row, idx) => (
          <div
            key={idx}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {row.map((card, i) => (
              <div key={i} className="min-w-[78vw] snap-start">
                {card}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* sm+: 3-column collage with subtle offsets */}
      <div className="hidden sm:grid max-w-6xl mx-auto grid-cols-2 lg:grid-cols-3 gap-5 px-6">
        {PREVIEWS.map((card, i) => (
          <div
            key={i}
            className={[
              "transition hover:-translate-y-0.5",
              i % 3 === 1 ? "lg:translate-y-6" : "",
              i % 3 === 2 ? "lg:translate-y-3" : "",
            ].join(" ")}
          >
            {card}
          </div>
        ))}
      </div>
    </>
  );
}
