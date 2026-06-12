import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/fasting-guide")({
  head: () => ({
    meta: [
      { title: "A Guide to Fasting | Christian Fasting Guide | GraceNotes Daily" },
      { name: "description", content: "A gentle, honest guide to Christian fasting — what it is, what the Bible shows us, the different kinds of fasting, how to prepare, and what to do after. For anyone who has felt nudged toward fasting but wasn't sure where to begin." },
      { property: "og:title", content: "A Guide to Fasting | GraceNotes Daily" },
      { property: "og:description", content: "Fasting is not for the advanced believer. It is for anyone who wants more of God than they currently have, and is willing to make room for Him." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/fasting-guide" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/homepage.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/fasting-guide" },
    ],
  }),
  component: FastingGuide,
});

function FastingGuide() {
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
              headline: "A Guide to Fasting",
              description: "A gentle, honest guide to Christian fasting — what it is, what the Bible shows us, the different kinds of fasting, how to prepare, and what to do after.",
              author: { "@type": "Organization", name: "GraceNotes Daily" },
              publisher: {
                "@type": "Organization",
                name: "GraceNotes Daily",
                logo: { "@type": "ImageObject", url: "https://www.gracenotesdaily.com/icons/icon-512.png" },
              },
              url: "https://www.gracenotesdaily.com/fasting-guide",
              image: "https://www.gracenotesdaily.com/og/homepage.png",
              datePublished: "2026-06-01",
              dateModified: "2026-06-01",
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.gracenotesdaily.com/" },
                { "@type": "ListItem", position: 2, name: "Christian Journaling", item: "https://www.gracenotesdaily.com/christian-journaling" },
                { "@type": "ListItem", position: 3, name: "A Guide to Fasting", item: "https://www.gracenotesdaily.com/fasting-guide" },
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
            A Guide to Fasting
          </h1>
          <p className="text-white/70 text-center text-sm mb-12 italic">A GraceNotes Daily Guide</p>

          <div className="space-y-8">

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">A word before you begin</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Fasting is one of those words that can make a person feel immediately behind. Like it belongs to a more serious category of Christian, someone further along, someone with more self-control, someone who has already sorted out the basics before attempting this.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                If that is where you are, this guide is written for you specifically. Not for the person who already fasts regularly and is looking for an advanced framework. For the person who has heard about fasting, maybe felt nudged toward it, and is not quite sure what it actually is or how to begin without doing it wrong.
              </p>
              <p className="text-white/80 leading-relaxed">
                There is not much you can do wrong here. There is only showing up with what you have and offering it honestly. That is the whole thing.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">What Fasting Actually Is</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Fasting, at its simplest, is choosing to go without something, usually food, for a set period of time, in order to give that time and energy to God instead.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                It is not a hunger strike. It is not a weight loss strategy with a spiritual label. It is not a way of twisting God's arm into answering a prayer He was otherwise planning to ignore. It is a deliberate act of saying: this thing I would normally give my attention to, I am setting it aside today because I want more of You than I want that.
              </p>
              <p className="text-white/80 leading-relaxed">
                The physical sensation of hunger, when it comes, becomes a prompt. Instead of reaching for food, you turn toward God. The fast becomes a kind of ongoing prayer posture that holds through the day, not just in the moments when you are actively praying. That is the heartbeat of it.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">What the Bible Shows Us About Fasting</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Fasting runs through Scripture the way a thread runs through a cloth. It is not occasional or unusual. It is simply what God's people did when something mattered enough to press in for.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Moses fasted for forty days on Mount Sinai when he received the law from God (Exodus 34:28). Not because God required the fast as a condition of showing up. Moses fasted because he was in the presence of something so significant that food became irrelevant.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Esther called a three-day fast before she approached the king to plead for her people's lives. "Fast for me," she told Mordecai. "Do not eat or drink for three days, night or day. I and my attendants will fast as you do. When this is done, I will go to the king, even though it is against the law. And if I perish, I perish" (Esther 4:16). That is not a person going through a spiritual ritual. That is a person preparing herself for the most important moment of her life by clearing everything else away.
              </p>
              <p className="text-white/80 leading-relaxed">
                In the New Testament, Jesus fasted for forty days in the wilderness before beginning his public ministry (Matthew 4:2). He did not say if you fast. He said when you fast (Matthew 6:16-17). The practice was assumed. The instruction was about how to do it with the right heart.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-6">The Different Kinds of Fasting</h2>
              <p className="text-white/80 leading-relaxed mb-6">
                You do not have to fast from food to fast. Though food is the most common and most biblically grounded form, fasting is ultimately about choosing to go without something you regularly reach for, so that the space it leaves becomes space for God.
              </p>
              <div className="space-y-5">
                {[
                  { title: "A full fast", body: "No food and sometimes no water for a set period. This is the most intense form and is typically reserved for a short, specific, significant reason. If you have any medical conditions, particularly around blood sugar, blood pressure, or medication that requires food, please consult a doctor before attempting a full fast." },
                  { title: "A partial fast", body: "Restricting what you eat rather than eliminating all food. The prophet Daniel is the clearest biblical example. When brought into the Babylonian king's court, Daniel chose to eat only vegetables and water rather than the king's rich food (Daniel 1:12). A partial fast is genuinely a fast." },
                  { title: "An intermittent fast", body: "Eating within a specific window of the day and giving the remaining hours to God rather than to food. Many people who are new to fasting begin here, and find that even fasting from breakfast extends their morning prayer time in a natural, unforced way." },
                  { title: "A fast from something other than food", body: "Choosing to go without something you regularly consume: social media, television, news, a particular comfort habit. This is a legitimate form of fasting, particularly when the thing you are fasting from is something that genuinely competes for the attention you are trying to give to God." },
                ].map(({ title, body }) => (
                  <div key={title}>
                    <p className="text-white font-semibold mb-1">{title}</p>
                    <p className="text-white/75 leading-relaxed text-sm">{body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">How to Prepare for a Fast</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                The preparation matters as much as the fast itself. Going into a fast without intention is just going without food, and that is called being busy, not fasting.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Before you begin, decide three things. First, what you are fasting from and for how long. Be specific and be honest about what you can sustain. A full day fast you complete is worth more spiritually than a three-day fast you abandon at breakfast. Second, what you are fasting for. Name it. Write it down. Third, what you will do with the time you would normally spend eating or consuming the thing you are giving up. Plan it in advance, because hunger and habit will fill that time with something if you do not.
              </p>
              <p className="text-white/80 leading-relaxed">
                Tell God what you are doing and why. Dedicate it. Say: I am giving this to You. I am clearing this space for You. I want to hear from You, and I want You to move in this.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">During the Fast</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Use the hunger. When the physical sensation of wanting food arrives, treat it as a reminder rather than an obstacle. Instead of pushing through or distracting yourself, pause and pray. Even briefly. "Lord, I am here. I am still here. This fast is for You." That redirection, repeated throughout the day, is the whole practice. The fast is not the going without. The fast is the turning toward.
              </p>
              <p className="text-white/80 leading-relaxed">
                Read Scripture more than usual during a fast. Your senses are sharper when they are not dulled by routine, and many people find that what they read during a fast stays with them in a different way. Be gentle with yourself on what you can and cannot do. You do not need to be at your professional or social best during a fast. Protect the day as much as you can.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">How to Break a Fast</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Breaking a fast is not just eating again. It is a moment of thanksgiving.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                Before you eat, take a few minutes to close the fast the way you opened it: in prayer. Thank God for the time. Acknowledge what happened, even if you are not sure yet what it was. Then eat something simple and easy on your body. Jumping straight into a heavy meal after a full-day fast is as uncomfortable as it sounds.
              </p>
              <p className="text-white/80 leading-relaxed">
                Write down anything that came to you during the fast: a verse that surfaced repeatedly, a sense of direction about something, a feeling of peace about a decision. Some of the most important things God says during a fast make full sense only weeks or months later, when you look back and recognise what He was doing.
              </p>
            </section>

            <section className="glass-parchment rounded-2xl p-8">
              <h2 className="font-display text-2xl text-white mb-4">A closing word</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                Fasting is not for the advanced believer. It is for anyone who wants more of God than they currently have, and is willing to make room for Him by clearing something else away.
              </p>
              <p className="text-white/80 leading-relaxed mb-4">
                You do not need a special occasion. You do not need to feel spiritually ready. Esther did not feel ready either. She fasted anyway, walked into the throne room, and the king extended his sceptre toward her.
              </p>
              <p className="text-white/80 leading-relaxed italic">
                The fast is the walking toward. God takes care of the rest.
              </p>
            </section>

          </div>

          <div className="mt-12 glass-on-hue rounded-2xl p-8 text-center">
            <DoveMark variant="medallion" className="w-14 h-14 mx-auto mb-4" />
            <h3 className="font-display text-2xl text-white mb-3">Walk your faith journey in GraceNotes Daily</h3>
            <p className="text-white/75 mb-6 text-sm leading-relaxed max-w-md mx-auto">
              Daily grace notes, prayer journaling, devotionals, and heart notes. A quiet space that walks alongside your faith every morning.
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
              <Link to="/free-prayer-toolkit" className="text-gold underline">The Effective Prayer Toolkit</Link>
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
