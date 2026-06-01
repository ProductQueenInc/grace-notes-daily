import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/quiet-time-app")({
  head: () => ({
    meta: [
      { title: "Quiet Time App for Christians | GraceNotes Daily" },
      { name: "description", content: "GraceNotes Daily is a quiet time app that gives you a devotional, a grace note, and a journaling space every morning — so your time with God is soft, consistent, and yours." },
      { property: "og:title", content: "Quiet Time App for Christians | GraceNotes Daily" },
      { property: "og:description", content: "A gentle daily quiet time app for Christians. Devotionals, grace notes, prayer journaling, and reflection — all in one soft, beautiful space." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/quiet-time-app" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Quiet Time App for Christians | GraceNotes Daily" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/quiet-time-app" },
    ],
  }),
  component: QuietTimeApp,
});

const faqs = [
  {
    q: "What is a quiet time?",
    a: "A quiet time is a deliberate, set-aside period each day to be with God — reading Scripture, praying, and listening. It doesn't have to be long. Ten consistent minutes will do more for your faith than an occasional hour.",
  },
  {
    q: "How do I start a quiet time if I don't know where to begin?",
    a: "The hardest part is deciding to show up. GraceNotes Daily removes the 'what do I do?' question entirely — each day you get a devotional reading, a personal grace note, and a journaling prompt already waiting for you.",
  },
  {
    q: "What's the best time of day for a quiet time?",
    a: "The best time is the one you'll actually keep. Most people find morning works well because it sets the tone before the day intrudes. GraceNotes Daily personalises your content to your preferred rhythm — morning, midday, evening, or night.",
  },
  {
    q: "Can a quiet time app replace an actual Bible?",
    a: "No, and it shouldn't try to. GraceNotes Daily is a companion that helps you build the habit and go deeper — not a replacement for Scripture. Every devotional is grounded in a Bible verse, and we encourage you to keep your Bible close.",
  },
  {
    q: "How is GraceNotes Daily different from other quiet time apps?",
    a: "Most quiet time apps give you generic content. GraceNotes Daily personalises each grace note and devotional to your current season of faith — whether you're just starting out, returning after a long absence, actively growing, or walking a mature path. It also combines devotionals with prayer journaling and heart notes in one space.",
  },
];

function QuietTimeApp() {
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
                { "@type": "ListItem", position: 2, name: "Quiet Time App", item: "https://www.gracenotesdaily.com/quiet-time-app" },
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
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4">Quiet Time App</p>
          <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow mb-6 leading-tight">
            A soft place to meet God every morning
          </h1>
          <p className="text-white/85 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            GraceNotes Daily gives you a devotional, a personal grace note, and a journaling space each day — so your quiet time is always ready, always gentle, and always yours.
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
            What a daily quiet time actually looks like
          </h2>
          <p className="text-white/75 text-center mb-12 max-w-xl mx-auto">
            Three soft practices. Ten minutes. The same time every day. That is what builds a faith that lasts.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", title: "Receive your Grace Note", desc: "A short, personal word written to meet you where you are today — grounded in Scripture and tailored to your season of faith." },
              { step: "2", title: "Read your Devotional", desc: "A guided reading with the verse of the day, a reflection, and a personal takeaway. Never generic. Always for you." },
              { step: "3", title: "Write a Heart Note", desc: "A few sentences of honest reflection. Pour out what is actually on your heart. GraceNotes Daily listens." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="glass-parchment rounded-2xl p-6">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center mb-4">
                  <span className="font-display text-gold text-lg">{step}</span>
                </div>
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
            Questions about quiet time
          </h2>
          <div className="space-y-3">
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 text-center relative z-10">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl text-white drop-shadow mb-4">
            Your quiet time starts today
          </h2>
          <p className="text-white/80 mb-8">
            You don't need more discipline. You need a gentler door. GraceNotes Daily is that door.
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
