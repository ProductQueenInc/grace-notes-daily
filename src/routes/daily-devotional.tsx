import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/daily-devotional")({
  head: () => ({
    meta: [
      { title: "Daily Devotional App for Christians | GraceNotes Daily" },
      { name: "description", content: "Build a daily quiet time habit that actually sticks. GraceNotes Daily gives you guided devotionals every morning so you always know what to do today." },
      { property: "og:title", content: "Daily Devotional App for Christians | GraceNotes Daily" },
      { property: "og:description", content: "Build a daily quiet time habit that actually sticks. GraceNotes Daily gives you guided devotionals every morning so you always know what to do today." },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/daily-devotional.png" },
      { property: "og:url", content: "https://www.gracenotesdaily.com/daily-devotional" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Daily Devotional App for Christians | GraceNotes Daily" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/daily-devotional.png" },
    ],
  }),
  component: DailyDevotion,
});

const faqs = [
  {
    q: "What is a daily devotional?",
    a: "A daily devotional is a set-aside time each day to read Scripture, pray, and reflect on your relationship with God. It can be as short as ten minutes or as long as you choose. Consistency matters more than length.",
  },
  {
    q: "What is a devotional app?",
    a: "A devotional app provides guided daily spiritual content, including readings, reflections, and prompts, to help believers build a consistent quiet time. GraceNotes Daily combines daily devotionals with prayer journaling and personal journaling in one space.",
  },
  {
    q: "How do I start a daily devotional habit if I have never had one?",
    a: "Start small and specific. Choose a time of day and a length you can actually keep, even ten minutes over your morning coffee. GraceNotes Daily provides the content for each session so you never have to figure out where to begin.",
  },
  {
    q: "How is GraceNotes Daily different from other devotional apps?",
    a: "GraceNotes Daily combines daily devotionals with prayer tracking and personal journaling in one companion app. It is designed to be a long-term record of your faith journey, including prayers you have prayed, prayers God has answered, and who you have become along the way.",
  },
];

function DailyDevotion() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
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
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
        )}
      </header>

      <section className="px-6 pt-10 pb-6 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">Daily Devotional</p>
        <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Showing Up Is the Practice
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
          The thing that orients your day, before the day gets to you.
        </p>
      </section>

      <section className="px-6 pb-20 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <p className="text-foreground/80 leading-relaxed text-lg">
              The challenge for most believers is not, not wanting to spend time with God.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              If you are honest with yourself, you probably want more of that, not less. The challenge is the morning itself, when everything else competes for the first available hour, and the good intention of yesterday does not automatically show up today with a plan.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              A daily devotional practice is the answer to that problem. Not because it is a rule you follow, but because it becomes the thing that orients your day before the day gets to you. Consider this an honest account of what we believe daily time with God actually does, and why we built GraceNotes Daily to support it.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What the Bible Shows Us About Daily Time with God</h2>
            <p className="text-foreground/75 leading-relaxed">
              Jesus was in the middle of the most consequential ministry in human history. People followed him everywhere. He was healing, teaching, confronting religious leaders, and being confronted in return. His schedule had no empty space. And yet Luke 5:16 records this almost as a side note:
            </p>
            <blockquote className="border-l-2 border-gold pl-5 py-1">
              <p className="text-foreground/80 italic leading-relaxed">"But Jesus often withdrew to lonely places and prayed."</p>
              <cite className="text-gold text-sm font-semibold not-italic mt-1 block">Luke 5:16</cite>
            </blockquote>
            <p className="text-foreground/75 leading-relaxed">
              Often. Not occasionally. Not when the schedule permitted. That is a striking detail. If anyone had reason to skip the quiet time in favor of the work, it was Jesus. And still, withdrawing to be with the Father was the non-negotiable thing. Not because he was performing devotion for anyone watching. Because he understood that everything he was doing flowed from those hours alone with God.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              In the Old Testament, Daniel's situation was considerably more dramatic. He was living under a king who had outlawed prayer to any god other than himself, with death by lion as the consequence. Daniel 6:10 tells us that when the law was signed, Daniel went to his upstairs room, opened his windows toward Jerusalem, got on his knees, and prayed three times. Just as he had done before.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Just as he had done before. The decree changed nothing about his practice because the practice was not built on favorable conditions. It was built on his relationship with God, and that relationship did not negotiate around threats.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Neither story is told to make you feel behind. They are told because they show us what a daily devotional practice actually is: not a religious obligation you complete, but a relationship you keep showing up for.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What We Are Hoping a Daily Devotional Practice Does for You</h2>
            <p className="text-foreground/75 leading-relaxed">
              The goal is not to add another item to your morning. It is to give you the one thing that makes everything else make more sense.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are hoping that over time, the daily habit you build through GraceNotes Daily becomes the anchor of your day. Not because it takes long, and not because it requires anything elaborate from you, but because consistency with God produces something that nothing else produces: a deepening trust in who God is and what He is doing in your life, even in the seasons where you cannot yet see what He is doing.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are hoping that on the mornings when you feel disconnected, unqualified, or simply going through the motions, you show up anyway. Because you have learned that showing up is the practice. You do not wait until you feel ready to be with someone you love. You simply go.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are also hoping that six months from now, you look back at where you were when you started and recognize that the person you are today is different in quiet ways. More grounded. More patient. More certain about what you believe, even in the middle of the things you still do not understand. That is what daily time with God does, slowly, without fanfare, and mostly on the ordinary mornings.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">A Few Things Worth Knowing About Building This Habit</h2>
            <p className="text-foreground/75 leading-relaxed">
              You do not need an hour. Ten focused minutes, given fully and intentionally, will do more for your faith than an hour spent partially present. Start where you genuinely can, not where you think you should be starting.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Consistency matters more than perfection. Missing a day does not erase a practice. It is simply a day you missed. The question is always the same: will you come back tomorrow?
            </p>
            <p className="text-foreground/75 leading-relaxed">
              The hardest part of any devotional practice is not the content. It is the decision to begin. Once you sit down, most people find they want to stay longer than they planned. GraceNotes Daily removes the friction of that first decision by giving you something ready to engage with every morning: a grace note for the day, a guided devotional reading, and a space to respond in your own words. You do not have to figure out what to do today. That part is already done for you.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              After a few weeks, most people find that the days they miss their quiet time feel noticeably different. Busier in the head. More reactive. Less settled. That difference is worth paying attention to. It tells you something real about what that time with God has actually been doing, even on the mornings when it did not feel like much.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">How GraceNotes Daily Walks Alongside You</h2>
            <p className="text-foreground/75 leading-relaxed">
              GraceNotes Daily is a Christian devotional companion app built around the simplicity of showing up each day. Each morning, it offers you a grace note: a verse, a word, or a prompt drawn from where you are in your journey. A short devotional reading gives you something to sit with and carry into the day. There is space to respond in your own words, space to write a prayer, and a quiet record accumulating in the background of every morning you show up.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Over time, that record becomes something meaningful: a personal history of your walk with God, written in your own hand, one day at a time.
            </p>
            <div className="pt-2">
              <Link
                to="/signup"
                className="inline-block px-6 py-3 rounded-full bg-grace text-white font-semibold text-sm hover:bg-grace-deep transition"
              >
                Start your daily devotional
              </Link>
            </div>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10">
            <p className="text-foreground/70 leading-relaxed text-center italic font-display text-xl">
              GraceNotes Daily is for exactly those mornings. Not the highlight reel of your faith. The daily practice of it.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-3xl text-white drop-shadow px-2">Frequently Asked Questions</h2>
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>

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
