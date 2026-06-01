import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { ShareBar } from "@/components/share-bar";
import { ChevronDown } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/prayer-journaling")({
  head: () => ({
    meta: [
      { title: "Prayer Journal App for Christians | GraceNotes Daily" },
      { name: "description", content: "Discover how prayer journaling can deepen your faith, build a daily prayer habit, and help you see God's faithfulness over time. GraceNotes Daily walks with you." },
      { property: "og:title", content: "GraceNotes Daily — Write your prayers. Watch God answer them." },
      { property: "og:description", content: "Discover how prayer journaling can deepen your faith, build a daily prayer habit, and help you see God's faithfulness over time." },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
      { property: "og:url", content: "https://www.gracenotesdaily.com/prayer-journaling" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GraceNotes Daily — Write your prayers. Watch God answer them." },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/prayer-journaling" },
    ],
  }),
  component: PrayerJournaling,
});

const faqs = [
  {
    q: "What is prayer journaling?",
    a: "Prayer journaling is the practice of writing your prayers down, whether requests, gratitude, honest feelings, or specific asks, as a way of deepening your relationship with God and creating a record you can return to over time.",
  },
  {
    q: "Do I need to be an experienced Christian to start prayer journaling?",
    a: "Not at all. Prayer journaling is one of the most accessible spiritual practices because it has no required format. If you are just beginning your faith journey, it is a natural place to start talking to God in your own words.",
  },
  {
    q: "How is a prayer journal app different from a regular notes app?",
    a: "A Christian prayer journal app like GraceNotes Daily is built specifically around the rhythm of prayer, with answered prayer tracking, daily devotional prompts, and a private space designed around your spiritual life rather than general productivity.",
  },
  {
    q: "How specific should my prayers be?",
    a: "As specific as you can make them. Specific prayers are easier to recognize when they are answered, which builds faith over time. That said, write what is real to you first. Specificity can grow as the practice does.",
  },
];

function PrayerJournaling() {
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
        <p className="text-gold uppercase tracking-widest text-xs font-semibold mb-3">Prayer Journaling</p>
        <h1 className="font-display text-4xl md:text-6xl text-white drop-shadow max-w-3xl mx-auto leading-tight">
          Writing Your Way Closer to God
        </h1>
        <p className="mt-4 text-white/80 text-lg max-w-xl mx-auto">
          Write your prayers. Watch God answer them.
        </p>
      </section>

      <section className="px-6 pb-20 relative z-10">
        <div className="max-w-3xl mx-auto space-y-6">

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <p className="text-foreground/80 leading-relaxed text-lg">
              There is something that happens when you write a prayer down.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              It slows you down just enough to mean it. The thought that might have floated past in a busy morning, the worry you carried without naming it, the gratitude you almost forgot, the thing you do not quite know how to say out loud, becomes something real when you write it. Something you gave to God intentionally, not just thought about giving.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              That is what prayer journaling is, at its most honest. Not a spiritual discipline reserved for mature believers. Not a format you have to get right before you begin. It is simply the practice of showing up and letting God into what is actually going on with you.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              If you have never tried it before, consider this an open invitation rather than a standard to measure yourself by. And if you have tried and drifted, that is not failure. That is just where you are right now, and here is a place to start again.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What Happens When God's People Pray</h2>
            <p className="text-foreground/75 leading-relaxed">
              The Bible is not short on stories about what happens when someone stops and actually prays. Not as a formality. As a real conversation with a God who listens and responds.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              In the New Testament book of Acts, the Apostle Peter was arrested and thrown into prison. The church, knowing he was facing execution, gathered and prayed through the night. While they were still praying, an angel appeared in Peter's cell, the chains fell off his hands, and the prison doors opened on their own. Peter walked straight out and made his way to the house where the believers were gathered. When he knocked, a servant girl recognized his voice and ran back to tell the others. They told her she was out of her mind. They were still praying for his release when the answer was standing at the door. (Acts 12:5-16)
            </p>
            <p className="text-foreground/75 leading-relaxed">
              That story is not in the Bible to impress us. It is there to remind us of what prayer is actually capable of.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              In the Old Testament, Hannah is one of the most searingly personal prayers recorded in Scripture. She desperately wanted a child and had been unable to conceive. She went to the temple and prayed with such raw grief and specificity that the priest watching her assumed she was drunk. She was not performing. She was talking to God about the one thing she wanted most, in exactly the words she had for it. God heard her. She conceived and gave birth to Samuel, one of the most significant figures in Israel's history. Her prayer is in 1 Samuel 1, and it is worth reading slowly.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              These are not stories about perfect people who prayed perfect prayers. They are stories about specific people, with specific needs, who brought what was real to a God who was paying attention.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What the Bible Says About Writing It Down</h2>
            <p className="text-foreground/75 leading-relaxed">
              Long before journaling was a wellness trend, God's people were writing things down.
            </p>
            <div className="space-y-4 my-2">
              {[
                { verse: "Write down the revelation and make it plain on tablets so that a herald may run with it.", ref: "Habakkuk 2:2" },
                { verse: "I remember the days of long ago; I meditate on all your works and consider what your hands have done.", ref: "Psalm 143:5" },
                { verse: "Let us hold unswervingly to the hope we profess, for he who promised is faithful.", ref: "Hebrews 10:23" },
              ].map((s) => (
                <blockquote key={s.ref} className="border-l-2 border-gold pl-5 py-1">
                  <p className="text-foreground/80 italic leading-relaxed">"{s.verse}"</p>
                  <cite className="text-gold text-sm font-semibold not-italic mt-1 block">{s.ref}</cite>
                </blockquote>
              ))}
            </div>
            <p className="text-foreground/75 leading-relaxed">
              These verses point to something we understand intuitively but often forget to practice: remembrance is an act of faith. When we write down what we have prayed, what we have felt, what we have asked, we create a record that our future selves can return to. A record that says: God was here. God answered. God was faithful.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">What We Are Hoping Prayer Journaling Does for You</h2>
            <p className="text-foreground/75 leading-relaxed">
              We built the prayer journaling feature in GraceNotes Daily because we believe in what happens over time. Not just in a single prayer session, though those matter, but in the accumulation of them.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Six months from now, we want you to scroll back through your prayer journal and find a prayer you forgot you prayed. And next to it, you will see that it was answered. Not always in the way you expected. But answered.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              We want the daily prayer habit you build here to become the thing that grounds you on hard mornings. For those who are just starting out and are not sure what the right words are: there are no right words. God receives what you actually feel more than what you think you are supposed to say. Hannah did not compose her prayer carefully. She poured it out.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              And for those of you who have been writing your prayers for years, we want GraceNotes Daily to give your practice a home that honors the depth you have already built.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">A Few Things Worth Knowing About How to Write Your Prayers</h2>
            <p className="text-foreground/75 leading-relaxed">
              GraceNotes Daily is designed to hold short, specific prayers, and that is intentional. The journal space is where you can be expansive, process your thoughts, and write at length. The prayer space is for something different.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Specific prayers are the ones you can look back at later and recognize when they have been answered. A prayer that says "Lord, help things get better" is honest, but it is hard to know when it has been answered. A prayer that says "Lord, I need a job by the end of this month, I am afraid, and I am trusting you" gives you something to return to. It gives God something to answer in a way you can see.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Write what you actually want. Not what you think you should want. Not what sounds appropriately humble or sufficiently spiritual. God is not intimidated by ambition or by large requests. He is not waiting for you to scale down your faith before He responds. The prayer that feels too big, too specific, too much to ask, is often the one most worth writing down.
            </p>
            <blockquote className="border-l-2 border-gold pl-5 py-1 my-2">
              <p className="text-foreground/80 italic leading-relaxed">"Ask and it will be given to you; seek and you will find; knock and the door will be opened to you."</p>
              <cite className="text-gold text-sm font-semibold not-italic mt-1 block">Matthew 7:7</cite>
            </blockquote>
            <p className="text-foreground/75 leading-relaxed">
              That is not a suggestion. That is a promise worth testing.
            </p>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
            <h2 className="font-display text-3xl text-grace">How GraceNotes Daily Walks Alongside You</h2>
            <p className="text-foreground/75 leading-relaxed">
              GraceNotes Daily is a Christian prayer journal app built for the long journey of faith, not just the good days. When you write a prayer, it lives in your private prayer space, searchable and yours. As prayers are answered, you can mark them, and over time your answered prayer journal becomes something extraordinary: a living record of God's faithfulness in your specific life. Not a testimony you heard. Your own.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              GraceNotes Daily holds the prayers that are still waiting too, the ones you return to, add to, and sit with. Nothing gets lost. Nothing gets forgotten. GraceNotes Daily holds it all, so that when you look back, you can see how far you have come and trust that God has been present for every step of it.
            </p>
            <div className="pt-2">
              <Link
                to={isLoggedIn ? "/home" : "/signup"}
                className="inline-block px-6 py-3 rounded-full bg-grace text-white font-semibold text-sm hover:bg-grace-deep transition"
              >
                {isLoggedIn ? "Open app" : "Start your prayer journal"}
              </Link>
            </div>
          </div>

          <div className="glass-parchment rounded-3xl p-8 md:p-10">
            <p className="text-foreground/70 leading-relaxed text-center italic font-display text-xl">
              You do not need a perfect prayer. You do not need a quiet house or a set amount of time or the right words. You need to start somewhere. GraceNotes Daily is here when you are ready.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-3xl text-white drop-shadow px-2">Frequently Asked Questions</h2>
            {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
          </div>

        </div>
      </section>

      <section className="px-6 pb-10 relative z-10">
        <div className="max-w-3xl mx-auto">
          <ShareBar
            url="https://www.gracenotesdaily.com/prayer-journaling"
            title="Prayer Journal App for Christians | GraceNotes Daily"
            description="Discover how prayer journaling can deepen your faith, build a daily prayer habit, and help you see God's faithfulness over time."
          />
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
