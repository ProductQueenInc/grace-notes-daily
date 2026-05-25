import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ - GraceNotes Daily" },
      { name: "description", content: "Frequently asked questions about GraceNotes Daily - your soft, daily companion for faith." },
      { property: "og:title", content: "GraceNotes Daily - FAQ" },
    ],
  }),
  component: FAQ,
});

const faqs = [
  { q: "What is GraceNotes Daily?", a: "A gentle, faith-based companion that meets you each day with a personal grace note, devotional, prayer tracker, and journaling space." },
  { q: "Is this affiliated with any specific denomination?", a: "No. We're rooted in scripture and a Christ-centered posture, but built for anyone exploring or deepening their walk with God." },
  { q: "How is it different from a Bible app?", a: "Bible apps focus on text. GraceNotes Daily focuses on tenderness - a daily message written to you, journaling that listens, and prayer that celebrates with you." },
  { q: "Is my data private?", a: "Yes. Your reflections and prayers are private to your account. We never sell your data and you can delete your account at any time." },
  { q: "Do I need to be a 'good Christian' to use this?", a: "Not at all. The whole point is grace. Whether you're brand new, returning, growing, or seasoned - you're welcome." },
  { q: "How do Daily Rhythms work?", a: "Each day has three soft practices: read your Grace Note, receive the devotional, and write a heart note. Complete all three for a 'gold day' - but there's no shame in missing a day." },
];

function FAQ() {
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2"><DoveMark variant="white" className="w-10 h-10" /><span className="font-display text-2xl">GraceNotes Daily</span><span className="text-gold"></span></Link>
        <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
      </header>
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl text-white text-center drop-shadow mb-3">Frequently asked questions</h1>
          <p className="text-center text-white/85 mb-10">Gentle answers - and feel free to <Link to="/contact" className="underline text-gold">reach out</Link> if you have more.</p>
          <div className="space-y-3">
            {faqs.map((f, i) => <Item key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

function Item({ q, a }: { q: string; a: string }) {
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
