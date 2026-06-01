import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/faith-habit-tracker")({
  head: () => ({
    meta: [
      { title: "Faith Habit Tracker for Christians | GraceNotes Daily" },
      { name: "description", content: "Build a consistent daily faith practice with GraceNotes Daily — a Christian habit tracker that celebrates streaks, tracks devotionals, prayer, and journaling all in one place." },
      { property: "og:title", content: "Faith Habit Tracker for Christians | GraceNotes Daily" },
      { property: "og:description", content: "Track your daily devotional, prayer, and journaling habits. GraceNotes Daily is a faith habit tracker that helps you build consistency without shame." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/faith-habit-tracker" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Faith Habit Tracker for Christians | GraceNotes Daily" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/faith-habit-tracker" },
    ],
  }),
  component: FaithHabitTracker,
});

const faqs = [
  {
    q: "What is a faith habit tracker?",
    a: "A faith habit tracker helps you build and monitor daily spiritual practices — devotional reading, prayer, journaling, or other rhythms that keep you connected to God. GraceNotes Daily tracks three core practices and shows your streak across days.",
  },
  {
    q: "Why does tracking faith habits matter?",
    a: "What gets measured gets done. When you can see your streak and your gold days building up over time, your brain starts to protect that streak. It's the same principle that makes fitness trackers work — applied to your spiritual life.",
  },
  {
    q: "What are 'Daily Rhythms' in GraceNotes Daily?",
    a: "Daily Rhythms are the three core practices that GraceNotes Daily tracks each day: reading your devotional, receiving your grace note, and writing a heart note. Complete all three and it's a gold day. Partial completion is copper or silver. There's no shame in any day — just a gentle invitation to come back.",
  },
  {
    q: "Does the streak reset if I miss a day?",
    a: "Yes — the streak counts consecutive days where all three rhythms are completed. Missing a day resets the streak, but your full history is never lost. Your Journey archive keeps every entry, every prayer, every grace note — so nothing you've built disappears.",
  },
  {
    q: "How is a faith habit tracker different from a general habit app?",
    a: "General habit apps are neutral. GraceNotes Daily is built specifically around the rhythms of Christian devotional practice — the content, the prompts, the prayers, and the journaling are all designed to strengthen your faith, not just your productivity.",
  },
];

function FaithHabitTracker() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.gracenotesdaily.com/" },
                { "@type": "ListItem", position: 2, name: "Faith Habit Tracker", item: "https://www.gracenotesdaily.com/faith-habit-tracker" },
              ],
            },
          ]),
        }}
      />
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="medallion" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <Link to="/home" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Open app</Link>
        ) : (
          <Link to="/login" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
        )}
      </header>

      <section className="px-6 py-20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4">Faith Habit Tracker</p>
          <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow mb-6 leading-tight">
            Build a daily rhythm with God — and actually keep it
          </h1>
          <p className="text-white/85 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            GraceNotes Daily tracks your devotional, prayer, and journaling habits — celebrating every gold day without shaming you for the ones you miss.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 rounded-full bg-gold text-white font-semibold text-lg hover:bg-gold/90 transition shadow-lg"
          >
            Welcome in
          </Link>
        </div>
      </section>

      <section className="px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center drop-shadow mb-4">
            How Daily Rhythms work
          </h2>
          <p className="text-white/75 text-center mb-12 max-w-xl mx-auto">
            Three practices. One streak. A lifetime of faithfulness building quietly.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { badge: "Copper", colour: "bg-amber-700/30 text-amber-300", title: "1 of 3 complete", desc: "You showed up. That matters more than you know." },
              { badge: "Silver", colour: "bg-slate-400/20 text-slate-200", title: "2 of 3 complete", desc: "You're building something real. Keep going." },
              { badge: "Gold", colour: "bg-gold/20 text-gold", title: "All 3 complete", desc: "A gold day. The streak grows. God sees every one." },
            ].map(({ badge, colour, title, desc }) => (
              <div key={badge} className="glass-parchment rounded-2xl p-6 text-center">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 ${colour}`}>{badge}</div>
                <h3 className="font-display text-white text-xl mb-2">{title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-white text-center drop-shadow mb-10">
            Questions about faith habit tracking
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center relative z-10">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-white drop-shadow mb-4">
            Your streak starts with one day
          </h2>
          <p className="text-white/80 mb-8">
            You don't need a perfect week. You need today. Start here.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-4 rounded-full bg-white text-grace font-semibold text-lg hover:bg-white/90 transition shadow-lg"
          >
            Welcome in
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition">
        <span className="font-display text-lg text-grace">{q}</span>
        <ChevronDown className={`w-5 h-5 text-grace shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-foreground/75 leading-relaxed">{a}</div>}
    </div>
  );
}
