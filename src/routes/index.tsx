import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import {
  Sparkles, BookHeart, HandHeart, Compass, Headphones,
  ChevronDown, Quote, ShieldCheck, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GraceNotes Daily - A soft daily space for spiritual growth" },
      {
        name: "description",
        content:
          "GraceNotes Daily is your gentle daily companion for prayer, devotion, journaling, and reflection. You are seen. You are held. You are welcome here.",
      },
      { property: "og:title", content: "GraceNotes Daily" },
      {
        property: "og:description",
        content: "A soft, held space for your spiritual journey - daily grace notes, prayer, devotionals, and reflection.",
      },
    ],
  }),
  component: Landing,
});

const phases = [
  { icon: Sparkles, title: "Newbie", desc: "I'm just starting to explore this whole God thing." },
  { icon: HandHeart, title: "Returnee", desc: "I used to be close to God. I'm slowly coming back." },
  { icon: Compass, title: "Growth", desc: "I know God. I'm ready to go deeper." },
  { icon: BookHeart, title: "Elder", desc: "Faith is a way of life for me." },
];

const features = [
  { icon: Sparkles, title: "Daily Grace Notes", desc: "A fresh word of love each morning - written to meet you exactly where you are." },
  { icon: BookHeart, title: "Heart Notes", desc: "A gentle journaling space. Pour out your heart and receive a quiet, grace-filled reply." },
  { icon: HandHeart, title: "Prayer Tracker", desc: "Hold your prayers in one place. Celebrate the answers with confetti and thanksgiving." },
  { icon: Compass, title: "Your Journey", desc: "Look back on how far you've come - every note, prayer, and answered moment." },
  { icon: Headphones, title: "Listen", desc: "Worship, prayer, and teaching curated to walk with you wherever you are." },
  { icon: Sun, title: "Daily Rhythms", desc: "Three soft, daily practices that build a gentle rhythm with God." },
];

const bibleStories = [
  {
    verse: "I seek you earnestly; my soul thirsts for you, my whole being longs for you.",
    ref: "Psalm 63:1",
    who: "David, shepherd, king, psalmist",
    outcome: "His daily walks with God produced 73 Psalms and a kingdom.",
  },
  {
    verse: "She was deeply distressed and prayed to the Lord and wept bitterly.",
    ref: "1 Samuel 1:10",
    who: "Hannah, a woman who brought everything",
    outcome: "That specific, honest prayer became the prophet Samuel.",
  },
  {
    verse: "Three times a day he got down on his knees and prayed, giving thanks to his God.",
    ref: "Daniel 6:10",
    who: "Daniel, statesman, prophet, exile",
    outcome: "Even when prayer was illegal, his daily rhythm outlasted four empires.",
  },
];

const faqs = [
  {
    q: "What is GraceNotes Daily?",
    a: "GraceNotes Daily is a gentle, faith-based companion that meets you each day with a personal grace note, devotional, prayer tracker, and journaling space. It's designed to feel like a soft, sacred pause - not another notification.",
  },
  {
    q: "Is this affiliated with any specific denomination?",
    a: "No. GraceNotes Daily is rooted in scripture and a Christ-centered posture, but it's designed for anyone exploring or deepening their walk with God - wherever you are on the journey.",
  },
  {
    q: "How is it different from a Bible app?",
    a: "Bible apps focus on text. GraceNotes Daily focuses on tenderness - a daily message written to you, a journaling space that listens, and a prayer tracker that celebrates with you.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your heart notes, prayers, and reflections are private to your account. We never sell your data, and you can delete your account at any time.",
  },
  {
    q: "Do I need to be a 'good Christian' to use this?",
    a: "Not at all. The whole point is grace. Whether you're brand new, returning, growing, or seasoned in faith - you're welcome here exactly as you are.",
  },
];

function Landing() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  return (
    <>
      <NatureBackground />
      <Header />

      {/* HERO */}
      <section className="px-6 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="max-w-3xl mx-auto text-center text-white fade-up">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-sm mb-6 border border-white/20">
            <Sparkles className="w-4 h-4 text-gold" />
            Your daily space for spiritual growth
          </p>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] mb-6 drop-shadow-lg">
            You are seen. <br />
            You are held. <br />
            <span className="text-gold">You are welcome here.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            GraceNotes Daily is a soft, gentle companion for your walk with God - meeting you with
            reflection, prayer, and presence, wherever you are.
          </p>
          <div className="flex justify-center">
            <Link
              to={isLoggedIn ? "/home" : "/login"}
              className="px-8 py-4 rounded-full bg-gold text-gold-foreground font-semibold shadow-xl hover:scale-[1.02] transition text-base"
            >
              {isLoggedIn ? "Open your space →" : "Begin your journey"}
            </Link>
          </div>
          <p className="text-xs text-white/70 mt-5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> All entries secure
          </p>
        </div>
      </section>


      {/* SOFT REASSURANCE STRIP */}
      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto glass rounded-3xl p-8 md:p-12 text-center">
          <Quote className="w-7 h-7 text-gold mx-auto mb-3" />
          <p className="font-display text-2xl md:text-3xl text-grace leading-snug max-w-3xl mx-auto">
            "Come to me, all who are weary and burdened, and I will give you rest."
          </p>
          <p className="text-sm text-foreground/75 mt-3">- Matthew 11:28</p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="pb-24 sm:px-6">
        <div className="max-w-6xl mx-auto px-6 sm:px-0">
          <SectionTitle eyebrow="What's inside" title="Everything you need for a gentle rhythm with God" />
        </div>
        {/* Mobile: horizontal snap rail. Tablet+: grid */}
        <div className="mt-10 sm:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-3 -mx-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6 text-foreground min-w-[78vw] snap-start">
              <span className="w-11 h-11 rounded-full bg-grace-soft text-grace flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </span>
              <h3 className="font-display text-2xl text-grace mb-1">{f.title}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto hidden sm:grid grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {features.map((f) => (
            <div key={f.title} className="glass rounded-3xl p-6 text-foreground hover:scale-[1.01] transition">
              <span className="w-11 h-11 rounded-full bg-grace-soft text-grace flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5" />
              </span>
              <h3 className="font-display text-2xl text-grace mb-1">{f.title}</h3>
              <p className="text-sm text-foreground/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* PHASES */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto glass rounded-3xl p-8 md:p-14">
          <SectionTitle
            eyebrow="Every step of the way"
            title="Tell us where you are. We'll meet you there."
            subtitle="We'll tailor your experience to your journey, from day one."
            dark
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {phases.map((p) => (
              <div key={p.title} className="rounded-2xl bg-white/70 border border-white/40 p-6 text-center hover:bg-white transition">
                <p.icon className="w-7 h-7 mx-auto text-grace mb-2" strokeWidth={1.75} />
                <div className="font-semibold text-grace">{p.title}</div>
                <div className="text-xs text-foreground/80 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BIBLE STORIES */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <SectionTitle eyebrow="In good company" title="Daily time with God has always changed things" />
          <div className="grid md:grid-cols-3 gap-4 mt-10">
            {bibleStories.map((s) => (
              <div key={s.who} className="glass rounded-3xl p-6 text-foreground">
                <Quote className="w-5 h-5 text-gold mb-3" />
                <p className="font-display text-lg text-grace leading-snug">"{s.verse}"</p>
                <p className="text-xs text-grace-deep font-bold mt-2">{s.ref}</p>
                <p className="text-xs text-foreground/80 mt-1">– {s.who}</p>
                <p className="text-sm text-foreground/80 leading-relaxed mt-3">{s.outcome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 pb-24">
        <div className="max-w-3xl mx-auto">
          <SectionTitle eyebrow="Frequently asked" title="Gentle answers to common questions" />
          <div className="space-y-3 mt-10">
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 md:p-14 text-center">
          <Moon className="w-7 h-7 text-gold mx-auto mb-3" />
          <h2 className="font-display text-3xl md:text-5xl text-grace mb-3">Begin gently. Stay softly.</h2>
          <p className="text-foreground/70 mb-7 max-w-xl mx-auto">
            One small, sacred pause a day. Yours to keep, at your own pace.
          </p>
          <Link
            to={isLoggedIn ? "/home" : "/login"}
            className="inline-block px-8 py-4 rounded-full bg-grace text-white font-semibold shadow-xl hover:opacity-95 transition"
          >
            {isLoggedIn ? "Open your space →" : "Begin your journey →"}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function Header() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  return (
    <header className="px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-2 sm:gap-3 text-white relative z-10">
      <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
        <DoveMark
          variant="medallion"
          className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 transition-transform group-hover:scale-105"
        />
        <span className="font-display text-[1.6rem] leading-none sm:text-3xl tracking-tight whitespace-nowrap">
          GraceNotes Daily
        </span>
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        <a href="#faq" className="px-4 py-2 rounded-full text-sm hover:bg-white/10 transition">FAQ</a>
        <Link to="/about" className="px-4 py-2 rounded-full text-sm hover:bg-white/10 transition">About</Link>
        <Link to="/contact" className="px-4 py-2 rounded-full text-sm hover:bg-white/10 transition">Contact</Link>
      </nav>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={isLoggedIn ? "/home" : "/login"}
          className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-semibold bg-white text-grace hover:bg-white/90 transition whitespace-nowrap"
        >
          {isLoggedIn
            ? <><span className="sm:hidden">Open</span><span className="hidden sm:inline">Open app</span></>
            : <><span className="sm:hidden">Start</span><span className="hidden sm:inline">Get started</span></>
          }
        </Link>
      </div>
    </header>
  );
}

function SectionTitle({
  eyebrow, title, subtitle, dark,
}: {
  eyebrow?: string; title: string; subtitle?: string; dark?: boolean;
}) {
  return (
    <div className="text-center">
      {eyebrow && (
        <p className={`text-[11px] uppercase tracking-[0.2em] font-semibold drop-shadow mb-3 ${dark ? "text-grace-deep" : "text-white"}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`font-display text-3xl md:text-5xl drop-shadow leading-tight ${dark ? "text-grace" : "text-white"}`}>{title}</h2>
      {subtitle && (
        <p className={`mt-3 max-w-2xl mx-auto ${dark ? "text-foreground/75" : "text-white/85"}`}>{subtitle}</p>
      )}
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/40 transition"
      >
        <span className="font-display text-lg text-grace">{q}</span>
        <ChevronDown className={`w-5 h-5 text-grace shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-foreground/75 leading-relaxed">{a}</div>}
    </div>
  );
}
