import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/answered-prayer-tracker")({
  head: () => ({
    meta: [
      { title: "Answered Prayer Tracker | See God's Faithfulness Over Time | GraceNotes Daily" },
      { name: "description", content: "Track your prayers and mark them answered. GraceNotes Daily is an answered prayer tracker that helps you see God's faithfulness built up over time — prayer by prayer." },
      { property: "og:title", content: "Answered Prayer Tracker | GraceNotes Daily" },
      { property: "og:description", content: "Write your prayers. Mark them answered. Watch evidence of God's faithfulness accumulate over months and years." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/answered-prayer-tracker" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Answered Prayer Tracker | GraceNotes Daily" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/answered-prayer-tracker" },
    ],
  }),
  component: AnsweredPrayerTracker,
});

const faqs = [
  {
    q: "Why should I track answered prayers?",
    a: "Because faith grows on evidence. When you can scroll back through a list of specific prayers that God answered, doubt has a much harder time taking root. An answered prayer record is one of the most powerful spiritual disciplines you can build.",
  },
  {
    q: "What counts as an answered prayer?",
    a: "Anything God responded to — including 'no' and 'not yet.' Many people only track yes answers, but recording how God redirected or held back a prayer is equally powerful. What you're building is a record of God's engagement with your life, not just a wish list.",
  },
  {
    q: "How specific should my prayers be?",
    a: "The more specific the better. Vague prayers are hard to recognise as answered. 'God please help with work' is easy to forget. 'God, please give me wisdom in the meeting with my manager on Thursday' is easy to mark answered — or to look back on and understand why it wasn't.",
  },
  {
    q: "How does the answered prayer tracker work in GraceNotes Daily?",
    a: "You write a prayer in your prayer journal. When it's answered, you tap to mark it and write a short note of thanksgiving. Your full prayer history stays in your journey archive — searchable, private, and yours forever.",
  },
  {
    q: "Can I add prayers from the past, not just today?",
    a: "Yes. You can write prayers any time, including retrospective entries about prayers that were already answered. Many people use this to build a foundation when they first start — capturing the most significant answered prayers they already carry.",
  },
];

function AnsweredPrayerTracker() {
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
                { "@type": "ListItem", position: 2, name: "Answered Prayer Tracker", item: "https://www.gracenotesdaily.com/answered-prayer-tracker" },
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
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4">Answered Prayer Tracker</p>
          <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow mb-6 leading-tight">
            Write your prayers.<br />Watch God answer them.
          </h1>
          <p className="text-white/85 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            GraceNotes Daily gives you a private prayer journal where you write specific prayers, mark them answered, and build up years of evidence of God's faithfulness — one prayer at a time.
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
          <h2 className="font-display text-3xl md:text-4xl text-white text-center drop-shadow mb-12">
            How it works
          </h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Write a specific prayer", desc: "Write your prayer in plain language. The more specific the better — God answers specific prayers in ways you can actually recognise." },
              { step: "2", title: "Keep it and come back", desc: "Your prayers live in your private journal. No one else sees them. Come back whenever you want to read, add to, or pray over them again." },
              { step: "3", title: "Mark it answered", desc: "When a prayer is answered, tap to mark it. Write a short thanksgiving note. Watch your record of God's faithfulness grow." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="glass-parchment rounded-2xl p-6 flex gap-6 items-start">
                <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <span className="font-display text-gold text-xl">{step}</span>
                </div>
                <div>
                  <h3 className="font-display text-white text-xl mb-2">{title}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 relative z-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-white text-center drop-shadow mb-10">
            Questions about tracking answered prayers
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center relative z-10">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-white drop-shadow mb-4">
            Your first prayer is waiting to be written
          </h2>
          <p className="text-white/80 mb-8">
            Start today. A year from now, you will want to have started today.
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
