import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";
import { BackHomeButton, BackHomeCard } from "@/components/back-home-cta";

export const Route = createFileRoute("/free-prayer-toolkit")({
  head: () => ({
    meta: [
      { title: "The Effective Prayer Toolkit | GraceNotes Daily" },
      { name: "description", content: "A practical, honest guide to prayer for Christians at every stage. Four ways to structure a prayer, how to pray when you don't feel like it, and five practices to carry into this week." },
      { property: "og:title", content: "The Effective Prayer Toolkit | GraceNotes Daily" },
      { property: "og:description", content: "An honest, practical guide to prayer grounded in Scripture. For anyone who has ever sat down to pray and not known where to begin." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/free-prayer-toolkit" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/free-prayer-toolkit" },
    ],
  }),
  component: FreePrayerToolkit,
});

function FreePrayerToolkit() {
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
              "@type": "Article",
              headline: "The Effective Prayer Toolkit",
              description: "A practical, honest guide to prayer for Christians at every stage — four prayer frameworks, how to pray when you don't feel like it, and five practices to carry into this week.",
              author: { "@type": "Organization", name: "GraceNotes Daily" },
              publisher: {
                "@type": "Organization",
                name: "GraceNotes Daily",
                logo: { "@type": "ImageObject", url: "https://www.gracenotesdaily.com/icons/icon-512.png" },
              },
              url: "https://www.gracenotesdaily.com/free-prayer-toolkit",
              image: "https://www.gracenotesdaily.com/og/prayer-journaling.png",
              datePublished: "2026-06-01",
              dateModified: "2026-06-01",
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.gracenotesdaily.com/" },
                { "@type": "ListItem", position: 2, name: "Prayer Journaling", item: "https://www.gracenotesdaily.com/prayer-journaling" },
                { "@type": "ListItem", position: 3, name: "The Effective Prayer Toolkit", item: "https://www.gracenotesdaily.com/free-prayer-toolkit" },
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

      <article className="px-6 py-16 relative z-10">
        <div className="max-w-2xl mx-auto">

          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 text-center">Guide</p>
          <h1 className="font-display text-4xl md:text-5xl text-white drop-shadow mb-6 text-center leading-tight">
            The Effective Prayer Toolkit
          </h1>
          <p className="text-white/70 text-center text-sm mb-12 italic">A GraceNotes Daily Guide</p>

          <div className="prose-grace space-y-8">

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">A word before you begin</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                This is not a course on prayer. It is not a checklist, and it is not a system you have to maintain perfectly before it counts.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                What it is, is a collection of honest, practical things about prayer that have helped people across centuries of faith, drawn from Scripture and from the lives of people who prayed through situations far more difficult than most of us will face. Some of what is here will be familiar. Some of it may shift something for you. Take what you need, leave what you do not, and return to it when the season changes and you need something different.
              </p>
              <p className="text-white/80 leading-relaxed">
                Prayer is a relationship, not a technique. But relationships, like gardens, do well when you bring a little intention to them. That is all this is.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">Why Prayer Feels Hard (And Why That Is Not the Problem You Think It Is)</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                If you have ever sat down to pray and found yourself staring at the ceiling, not sure where to begin, or starting and stopping, or finishing and wondering whether any of it landed, you are not behind. You are in very good company.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                The disciples spent three years walking alongside Jesus. They watched him heal people, calm storms, and hold conversations that turned entire communities upside down. And at some point in the middle of all of that, they came to him and said: Lord, teach us to pray (Luke 11:1).
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Not teach us to do miracles. Not teach us to preach. Teach us to pray. These were people who had been praying their whole lives, raised in a faith tradition with prayers woven into every part of daily life. And still, watching Jesus pray, they knew there was something they did not yet have.
              </p>
              <p className="text-white/80 leading-relaxed">
                That is not discouraging. That is one of the most freeing things in the New Testament. Because it means that wanting to pray better, feeling uncertain about how to do it, sensing the gap between where you are and where you want to be, is not a sign of weak faith. It is the beginning of a deeper one. The prayer that brought the disciples to Jesus was not eloquence or confidence. It was hunger. And hunger, it turns out, is exactly the right place to start.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-6">Four Ways to Structure a Prayer</h2>
              <p className="text-white/80 leading-relaxed mb-6">
                There is no single correct format for prayer. What the following frameworks offer is not a rule, but a doorway. When you do not know where to begin, a structure gives you somewhere to put your foot.
              </p>

              <div className="space-y-8">
                <div>
                  <h3 className="font-display text-xl text-gold mb-3">The ACTS Framework</h3>
                  <p className="text-white/80 leading-relaxed mb-3">This is one of the most widely used prayer structures, and for good reason. It covers the full range of what prayer can hold.</p>
                  <p className="text-white/80 leading-relaxed mb-3"><span className="text-white font-semibold">Adoration:</span> start by telling God who He is, not what you need. Take a moment before the requests to simply acknowledge the God you are speaking to. Not because He needs reminding, but because you do. That reorientation changes the posture of everything that follows.</p>
                  <p className="text-white/80 leading-relaxed mb-3"><span className="text-white font-semibold">Confession:</span> bring what is actually in you. The resentment you have been carrying. The way you handled something and know it. The distance you have felt. God is not surprised by any of it, and confession is not about informing Him of your failures. It is about choosing not to come before Him while pretending those things are not there.</p>
                  <p className="text-white/80 leading-relaxed mb-3"><span className="text-white font-semibold">Thanksgiving:</span> name specific things. Not "thank you for everything," though that is a fine start. Specificity in gratitude, like specificity in prayer, keeps faith from becoming abstract.</p>
                  <p className="text-white/80 leading-relaxed"><span className="text-white font-semibold">Supplication:</span> now bring your requests. For yourself, for others, for the things that are heavy, and for the things that feel small but matter to you. God is not a gatekeeper who requires you to earn the right to ask. He is a Father who asks his children to bring their needs to him. Ask freely.</p>
                </div>

                <div>
                  <h3 className="font-display text-xl text-gold mb-3">Conversational Prayer</h3>
                  <p className="text-white/80 leading-relaxed mb-3">Some of the most significant prayer in Scripture has no structure at all. It is simply a person talking to God the way they would talk to someone who loves them and is paying attention.</p>
                  <p className="text-white/80 leading-relaxed">Nehemiah was the cupbearer to the Persian king. When he heard that Jerusalem's walls were broken down, he wept and prayed for days. And then, standing in front of the king, Nehemiah writes a small extraordinary detail: "I prayed to the God of heaven, and I answered the king" (Nehemiah 2:4-5). A prayer in the half-second between a question and an answer. No format. No prepared words. Just a man who had made it a habit to turn toward God first. Conversational prayer works the same way. You bring what is actually on your mind. You speak it plainly. You leave space to listen.</p>
                </div>

                <div>
                  <h3 className="font-display text-xl text-gold mb-3">Praying Scripture</h3>
                  <p className="text-white/80 leading-relaxed mb-3">The Psalms exist, in part, as a prayer book. They were written to be prayed, sung, and spoken aloud by people who needed the words of God to pray back to God.</p>
                  <p className="text-white/80 leading-relaxed">When you do not have words of your own, use His. Psalm 23 for the seasons when you feel led through something you cannot see. Psalm 46 for when the world is loud and you need to be still. Psalm 139 for when you need to remember you are known. Psalm 62 for when you are waiting and tired of waiting. You are not reciting. You are praying. There is a difference, and you will feel it.</p>
                </div>

                <div>
                  <h3 className="font-display text-xl text-gold mb-3">Listening Prayer</h3>
                  <p className="text-white/80 leading-relaxed">After you have spoken, sit in the quiet for a few minutes without an agenda. This is the part most of us skip because it is the part that feels uncertain. But some of the clearest things God speaks are not dramatic or audible. They are a sudden quiet knowing. A verse that surfaces in your mind. A sense of peace about something you were anxious about. You do not have to receive something every time. But giving God the space to speak is worth practising, even when the silence feels empty. The habit of turning toward Him and waiting is itself a form of trust.</p>
                </div>
              </div>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">Praying When You Do Not Feel Like It</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                There will be seasons when prayer feels like speaking into a wall. When the words come out flat and you stand up feeling no different than when you sat down. When you cannot remember the last time you felt close to God.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                David knew that season. In Psalm 13, he opens with: "How long, Lord? Will you forget me forever? How long will you hide your face from me?" He is not performing spiritual composure. He is naming the exact feeling, directly to God, without softening it.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                And then, within the same short Psalm, something shifts: "But I trust in your unfailing love; my heart rejoices in your salvation." Not because the circumstances changed. Because he prayed through the feeling instead of waiting until the feeling improved before he prayed.
              </p>
              <p className="text-white/80 leading-relaxed">
                Elijah was exhausted and asking to die under a broom tree (1 Kings 19:4). God did not tell him to get it together. God let him sleep, gave him food, and then spoke to him in a gentle whisper. The whisper came after Elijah showed up, even in the state he was in. Show up in the state you are in. That is enough to begin.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-6">Five Practices to Carry Into This Week</h2>
              <p className="text-white/80 leading-relaxed mb-6">These are not permanent commitments. They are seven-day experiments. Try one. See what it does.</p>
              <div className="space-y-6">
                {[
                  { title: "Pray before you check your phone.", body: "Whatever the first ten minutes of your morning look like right now, try giving them to God before the day's information reaches you. It does not need to be long. It needs to be first." },
                  { title: "Write one specific prayer today.", body: "Not a general request. Something particular: a name, a number, a situation, a date. Specific prayers become the ones you can look back at and recognise when they have been answered." },
                  { title: "Use a Psalm to pray this week.", body: "Pick one. Read it slowly, as your own prayer, once a day for seven days. Notice what it feels like by day seven compared to day one." },
                  { title: "Pray for one other person by name each day.", body: "Not a general 'bless everyone I love.' One person, one specific thing you are asking God for on their behalf. You do not need to tell them. This is between you and God." },
                  { title: "End your prayer with a moment of quiet.", body: "Even two minutes. Speak what you have to say, and then sit still. Not waiting for a particular thing. Just being with God in the way you would sit with someone you trust after a long conversation." },
                ].map(({ title, body }) => (
                  <div key={title}>
                    <p className="text-white font-semibold mb-1">{title}</p>
                    <p className="text-white/75 leading-relaxed text-sm">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">A closing word</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                You do not need this toolkit to be perfect or complete before you begin. You need one thing from it, the one that met you where you are right now, and you need to take it with you into tomorrow morning.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Prayer is not the sum of your techniques. It is the sum of your turning. Every time you turn toward God, something happens, even when you cannot feel it, even when the words are inadequate, even when you are not sure He heard.
              </p>
              <p className="text-white/80 leading-relaxed italic">
                He heard. He always has.
              </p>
            </section>

          </div>

          <div className="mt-12 glass-on-hue rounded-2xl p-8 text-center">
            <DoveMark variant="medallion" className="w-14 h-14 mx-auto mb-4" />
            <h3 className="font-display text-2xl text-white mb-3">Continue your prayer life in GraceNotes Daily</h3>
            <p className="text-white/75 mb-6 text-sm leading-relaxed max-w-md mx-auto">
              A daily grace note, guided devotional, prayer journal, and heart notes — all in one quiet space. Built for people who want to pray consistently, not perfectly.
            </p>
            {isLoggedIn ? (
              <Link to="/home" className="inline-block px-8 py-3 rounded-full bg-gold text-white font-semibold hover:bg-gold/90 transition">Open the app</Link>
            ) : (
              <Link to="/login" className="inline-block px-8 py-3 rounded-full bg-gold text-white font-semibold hover:bg-gold/90 transition">Welcome in</Link>
            )}
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/75 text-sm">
              More guides:{" "}
              <Link to="/fasting-guide" className="text-gold underline">A Guide to Fasting</Link>
              {" "}·{" "}
              <Link to="/7-day-prayer-journal" className="text-gold underline">7-Day Prayer Journal Starter Kit</Link>
            </p>
          </div>

        </div>
      </article>

      <SiteFooter />
    </>
  );
}
