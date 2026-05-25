import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Heart, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/christian-journaling")({
  head: () => ({
    meta: [
      { title: "Christian Journaling App | GraceNotes Daily" },
      { name: "description", content: "Discover how Christian journaling deepens your faith, helps you process life honestly with God, and creates a record of your spiritual journey you can return to." },
      { property: "og:title", content: "GraceNotes Daily — Tell God everything and watch what He does with it." },
      { property: "og:description", content: "Discover how Christian journaling deepens your faith, helps you process life honestly with God, and creates a lasting record of your spiritual journey." },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/christian-journaling.png" },
      { property: "og:url", content: "https://www.gracenotesdaily.com/christian-journaling" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GraceNotes Daily — Tell God everything and watch what He does with it." },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/christian-journaling.png" },
    ],
  }),
  component: ChristianJournaling,
});

const faqs = [
  {
    q: "What is Christian journaling?",
    a: "Christian journaling is the practice of writing your thoughts, prayers, reflections, and experiences with God, as a way of deepening your faith, processing life through a spiritual lens, and building a lasting record of your relationship with God.",
  },
  {
    q: "Do I need to be a good writer to journal?",
    a: "Not at all. Journaling has nothing to do with writing ability. It is a conversation, not a composition. The only requirement is honesty.",
  },
  {
    q: "What is the difference between prayer journaling and Christian journaling in GraceNotes Daily?",
    a: "In GraceNotes Daily, your prayer space is for specific, direct prayers: clear asks you can one day mark as answered. Your journal is for everything else: processing, reflection, longer thoughts, and honest expression. Both are part of a complete spiritual practice.",
  },
  {
    q: "How does journaling build faith over time?",
    a: "Reading back through old journal entries gives you evidence of growth and of God's faithfulness that is almost impossible to see in real time. The accumulation of honest writing becomes a personal record of what God has done in your specific life, which deepens trust in ways that abstract belief alone often cannot.",
  },
  {
    q: "Is my journal in GraceNotes Daily private?",
    a: "Yes. Your journal, your prayers, and all your content in GraceNotes Daily are completely private and belong only to you.",
  },
];

function ChristianJournaling() {
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
          <Heart className="w-5 h-5 fill-current" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
        </Link>
        {isLoggedIn ? (
          <Link to="/home" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Open app</Link>
        ) : (
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
        )}
      </header>

      <section className="px-6 pt-10 pb-6 relative z-10 text-center">
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">Christian Journaling</p>
        <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Your Honest Conversation with God
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
          Tell God everything and watch what He does with it.
        </p>
      </section>

      <section className="px-6 pb-20 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <p className="text-foreground/80 leading-relaxed text-lg">
              Before there were journals with pretty covers and morning routines built around them, there were the Psalms.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              One hundred and fifty of them. Written across decades by David, a shepherd who became a king, a man who loved God deeply and also sinned badly and also doubted and also wept and also danced. The Psalms are not a theological treatise. They are a journal. They are what happened when one person decided to bring everything to God rather than sorting through what was acceptable to bring first.
            </p>
            <div className="space-y-4">
              <blockquote className="border-l-2 border-gold pl-5 py-1">
                <p className="text-foreground/80 italic leading-relaxed">"How long, Lord? Will you forget me forever? How long will you hide your face from me?"</p>
                <cite className="text-gold text-sm font-semibold not-italic mt-1 block">Psalm 13:1</cite>
              </blockquote>
            </div>
            <p className="text-foreground/75 leading-relaxed">
              That is not a polished prayer. That is a man writing down what he actually felt, directing it at God, and trusting that God could handle it. Psalm 22 opens in anguish and ends in worship. The journey between those two places, across a single psalm, is the same journey that happens in a journal when you start writing what is real and keep going long enough to find what is also true.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              The Bible's longest book is a model for Christian journaling, and it does not look like the sanitized version of faith we sometimes perform for ourselves. It looks like someone talking honestly to God about everything.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What Honest Journaling With God Actually Looks Like</h2>
            <p className="text-foreground/75 leading-relaxed">
              The prophet Jeremiah was one of the most honest writers in all of Scripture. In Jeremiah 20, he writes words that most believers would be nervous to say out loud, let alone put on paper: "You deceived me, Lord, and I was deceived. You overpowered me and prevailed." He goes on to curse the day he was born.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              And then, in the same passage, he turns back to God. "But the Lord is with me like a mighty warrior."
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Jeremiah did not resolve the tension before he wrote it down. He wrote through the tension, all of it, and arrived somewhere on the other side. That is what journaling can do. It does not require you to have a tidy faith before you begin. It gives you a space to work out what you actually believe in the presence of God, who already knows what is in you and is not surprised by any of it.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Christian journaling is not about producing beautiful writing or maintaining a record of spiritual victories. It is about the conversation. The ongoing, honest, sometimes messy conversation with a God who invites you to come as you are, not as you intend to be.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What We Are Hoping Journaling Does for You</h2>
            <p className="text-foreground/75 leading-relaxed">
              We are hoping that your journal in GraceNotes Daily becomes the place where you stop performing your faith and start living it on the page.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are hoping you write the things you are not sure you are allowed to feel: the doubt, the frustration, the grief, the honest desire for something that has not come yet. Not because God needs to be informed, but because you need to say it, and saying it to God changes something in you that saying it elsewhere does not.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are also hoping that over time, your journal becomes a record of how far you have come. Not a highlight reel, but a true account. The entries from hard seasons will sit alongside the entries from breakthrough ones, and together they will show you something you cannot see in the moment: a God who was present in all of it. A faith that is genuinely yours, not borrowed from someone else's story.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We are hoping that six months from now, a year from now, you read something you wrote in a difficult moment and realize it was actually the beginning of something. That is what journals do. They hold the beginnings we do not recognize as beginnings until later.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">A Few Things Worth Knowing About Christian Journaling</h2>
            <p className="text-foreground/75 leading-relaxed">
              Your journal in GraceNotes Daily is separate from your prayer space, and that distinction is intentional. Prayers in GraceNotes Daily are meant to be specific and direct: a clear ask, a particular need, something you can one day look back at and recognize as answered. The journal is for everything else. The processing, the reflection, the long thoughts, the things you are still figuring out. Both matter. They serve different purposes.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              You do not need to write beautifully. You do not need complete thoughts or correct theology or a structured entry. The only thing a journal requires is honesty. Write what is true for you today, in whatever words you have for it.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              You can write things you would not say out loud. The journal is private, and God already knows what is in you. There is no confession you could write that would change how He sees you. There is only the relief of having said it, and the surprising thing that often happens next: clarity. Or peace. Or a verse you have not thought of in years that rises up from somewhere and says exactly the right thing.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Come back and read old entries. This is one of the most undervalued practices in journaling. Reading what you wrote three months ago, six months ago, a year ago, gives you evidence of growth you cannot otherwise see. It also gives you evidence of God's faithfulness: the things He brought you through, the prayers He answered, the fears that turned out to be smaller than they felt in the writing. That evidence compounds over time into something foundational. A faith that is not just believed but witnessed, in your own story, in your own handwriting.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">How GraceNotes Daily Walks Alongside You</h2>
            <p className="text-foreground/75 leading-relaxed">
              GraceNotes Daily holds your journal as part of a larger whole. Your prayers are there. Your daily devotional reflections are there. And your journal is there for the fuller expression of everything you are carrying, everything you are grateful for, everything you are still working through.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Together, these three spaces create something rare: a single, private companion for your whole inner life of faith. Not separate apps for separate practices, but one place that knows your whole journey, because you have been building it, one honest entry at a time.
            </p>
            <div className="pt-2">
              <Link
                to={isLoggedIn ? "/home" : "/signup"}
                className="inline-block px-6 py-3 rounded-full bg-grace text-white font-semibold text-sm hover:bg-grace-deep transition"
              >
                {isLoggedIn ? "Open app" : "Start your journal"}
              </Link>
            </div>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10">
            <p className="text-foreground/70 leading-relaxed text-center italic font-display text-xl">
              Your journal will not be a psalm in the biblical sense. But it will be yours, and it will be real, and God will be present in every word of it. That is enough. That is more than enough.
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
