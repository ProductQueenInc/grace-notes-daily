import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";
import { BackHomeButton, BackHomeCard } from "@/components/back-home-cta";

export const Route = createFileRoute("/7-day-prayer-journal")({
  head: () => ({
    meta: [
      { title: "7-Day Prayer Journal Starter Kit | GraceNotes Daily" },
      { name: "description", content: "Seven days of guided prayer journal prompts grounded in Scripture. For anyone beginning a prayer journaling practice — or beginning again." },
      { property: "og:title", content: "7-Day Prayer Journal Starter Kit | GraceNotes Daily" },
      { property: "og:description", content: "Seven mornings of guided prayer and reflection. Each day has a biblical story, a reflection prompt, and a prayer space. Begin whenever you are ready. God is already here." },
      { property: "og:url", content: "https://www.gracenotesdaily.com/7-day-prayer-journal" },
      { property: "og:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://www.gracenotesdaily.com/og/prayer-journaling.png" },
    ],
    links: [
      { rel: "canonical", href: "https://www.gracenotesdaily.com/7-day-prayer-journal" },
    ],
  }),
  component: SevenDayPrayerJournal,
});

const days = [
  {
    number: "Day One",
    subtitle: "Beginning Again",
    tagline: "For the person who feels like they are starting from scratch.",
    verse: "Return to me, and I will return to you.",
    ref: "Malachi 3:7",
    reflection: "Where are you arriving from today? Not the full story, just the honest sentence or two that describes where you are right now, in this moment, as you begin.",
    body: "There is a moment in the Gospel of John that is easy to walk past if you are reading quickly. Jesus has been arrested. Peter, who hours earlier had declared he would die before he denied his Lord, has just done exactly what he said he would never do. Three times, to three different people, in the space of a single night. And then the rooster crowed, and Peter went outside and wept bitterly (Luke 22:62).\n\nBut the story does not stop there. After the resurrection, Jesus appears to his disciples by the Sea of Galilee. He has made a fire on the beach and is cooking fish. And then, quietly, without an audience and without ceremony, Jesus turns to Peter and asks him three times: do you love me? (John 21:15-17). Once for each denial. Not to humiliate him. To restore him.\n\nThat is what beginning again looks like in the hands of Jesus. Not a wiped slate that pretends nothing happened. A specific, tender, deliberate restoration that meets the failure exactly where it was.\n\nYou do not have to explain yourself before you begin. You do not have to account for the gap between the last time and now. Just come. Just start. The conversation has been waiting for you, not impatiently, but the way a light stays on in a window for someone who is on their way home.\n\nToday, you are returning. That is the whole of Day One.",
    closing: "You showed up today. That matters more than you know.",
  },
  {
    number: "Day Two",
    subtitle: "Bringing What Is Real",
    tagline: "For the person who does not know how to pray without performing.",
    verse: "The Lord is near to all who call on him, to all who call on him in truth.",
    ref: "Psalm 145:18",
    reflection: "Is there something you have been bringing to God in a cleaned-up version? What would the honest, unedited version of that prayer actually say?",
    body: "There is a woman in Luke 18 who appears in one of Jesus's parables. She is a widow. She has a dispute, someone has wronged her, and she needs a judge to rule in her favour. The judge neither fears God nor cares about people. But she keeps coming back. Day after day, she returns with the same request. She does not dress it up. She does not make it more sophisticated. She brings the same honest need, repeatedly, until the judge eventually rules in her favour simply because she will not stop coming (Luke 18:3-5).\n\nThe widow did not perform for the judge. She came with what was real and she kept coming with what was real until something moved.\n\nMost of us have been taught, somewhere along the way, to manage our presentation before God. To clean up the request before we bring it. To soften the desperation, qualify the anger, dress up the fear in more acceptable spiritual language. God receives both prayers. But only one of them is honest.\n\nThe Psalms are the clearest evidence in all of Scripture that God is not looking for polished prayers. Psalm 88 ends with the word darkness. Not with a turn toward hope. Just: darkness. It has been in the Bible for three thousand years.\n\nToday, bring what is real. Not what you think you should be feeling. What is actually true for you in this moment, on this page, before anyone else is looking. God has seen it already. He is simply waiting for you to say it out loud.",
    closing: "God received that. All of it, exactly as you wrote it.",
  },
  {
    number: "Day Three",
    subtitle: "Waiting",
    tagline: "For the person in a season with no visible movement.",
    verse: "He has made everything beautiful in its time.",
    ref: "Ecclesiastes 3:11",
    reflection: "What are you waiting on right now? Write it down specifically, the way you would write it if you believed God was going to answer it and you wanted a record of when the prayer began.",
    body: "Abraham was seventy-five years old when God promised him a son. He was one hundred when Isaac was born (Genesis 12:4, 21:5). Twenty-five years between the promise and the fulfilment. Twenty-five years of the same sky, the same silence, the same promise sitting in the air without visible evidence that it was going to happen.\n\nThe Bible does not skip over that gap. It documents it honestly, including the moments when Abraham and Sarah tried to make the promise happen on their own terms. It records the times Abraham laughed at the idea (Genesis 17:17). These are not people who waited with serene composure. They waited the way most of us wait: with hope and doubt and occasional detours.\n\nWaiting is not the absence of God's activity. It is often the location of it. The seed in the ground is not visible to anyone looking at the soil, but something is happening underneath. Joseph spent years in a pit and then a prison before he stood before Pharaoh (Genesis 37 to 41). The waiting was not wasted time. It was preparation they did not have the vantage point to see while they were in it.\n\nBring your waiting here today. Name it. Write it. Give it to God not as a resignation but as an act of trust: I am still here. I still believe. I am still waiting on You.",
    closing: "Your waiting is not invisible. It is seen, it is held, and it is not without purpose.",
  },
  {
    number: "Day Four",
    subtitle: "Gratitude as a Practice",
    tagline: "For the person who knows they should be grateful but cannot always feel it.",
    verse: "Give thanks to the Lord, for he is good; his love endures forever.",
    ref: "Psalm 107:1",
    reflection: "Name three specific things you are grateful for right now. Not general categories. Three particular, specific things that happened or exist in your life that you want to remember God for.",
    body: "There is a story in Luke 17 that is easy to read quickly and miss the weight of. Ten men with leprosy call out to Jesus from a distance, asking for mercy. He heals all ten of them. All ten receive the miracle.\n\nOne comes back. He throws himself at Jesus's feet and thanks him. And Jesus, who has just healed ten people, asks a question that sits quietly in the text: \"Were not all ten cleansed? Where are the other nine?\" (Luke 17:17).\n\nThe story is not told to make us feel guilty about the things we have forgotten to thank God for. It is told because it captures something true about how easy it is, when the thing we needed arrives, to carry on into the next thing. The healing becomes the new normal so quickly. The answered prayer becomes the baseline.\n\nGratitude, practised as a discipline rather than waited for as a feeling, is the thing that keeps us from living like the nine. Paul writes: \"Give thanks in all circumstances; for this is God's will for you in Christ Jesus\" (1 Thessalonians 5:18). Not for all circumstances. In all circumstances. The gratitude is not for the difficulty. It is a posture you hold within it.\n\nToday, the practice is simple: name what you are grateful for, but not in a general way. Specifically enough that you could look back at this page in a year and know exactly what God did in this season of your life.",
    closing: "You turned back today. That is the one who mattered in the story.",
  },
  {
    number: "Day Five",
    subtitle: "Praying for Someone Else",
    tagline: "For the day the focus moves outward.",
    verse: "I urge, then, first of all, that petitions, prayers, intercession and thanksgiving be made for all people.",
    ref: "1 Timothy 2:1",
    reflection: "Who is on your heart right now? Write their name and one honest sentence about what you know they are carrying.",
    body: "Job is one of the most difficult books in the Bible to sit with. A man who loses everything, who suffers in ways that feel disproportionate to anything he has done. And then, at the end of the book, after God has spoken and Job has responded, there is a quiet instruction: pray for your friends (Job 42:8). The friends who came to sit with him in his suffering and ended up making it worse with their theology. God tells Job to pray for those specific people.\n\nAnd when he does, when Job prays for his friends, the text records something striking: \"After Job had prayed for his friends, the Lord restored his fortunes and gave him twice as much as he had before\" (Job 42:10).\n\nThe restoration came after the intercession. The man who had every reason to be focused entirely on his own enormous loss and pain turned his prayer outward, toward others, and something shifted.\n\nThere is something that happens when we pray for other people. The act of intercession moves us, even briefly, out of the interior of our own story and into someone else's. It reminds us that God's attention is not a finite resource we are competing for.\n\nToday, think of one person who is in your life right now. Bring them here. Write their name. Pray for them specifically, the way you would want someone to pray for you.",
    closing: "Someone is being carried today because you showed up for them. They may never know. God does.",
  },
  {
    number: "Day Six",
    subtitle: "The Prayer You Have Not Written Yet",
    tagline: "For the thing you have been afraid to bring.",
    verse: "Ask and it will be given to you; seek and you will find; knock and the door will be opened to you.",
    ref: "Matthew 7:7",
    reflection: "What is the prayer you have been circling around without writing down? What would you ask for if you believed fully, for one moment, that God was both able and willing?",
    body: "There is a moment in Mark 10 that stops most people when they really read it. A blind man named Bartimaeus is sitting by the road outside Jericho when he hears that Jesus is passing by. He starts shouting. The crowd tells him to be quiet. He shouts louder (Mark 10:46-48).\n\nJesus stops. He calls for the man. And then he asks him a question that seems, on the surface, obvious: \"What do you want me to do for you?\" (Mark 10:51). The man is blind. What could he possibly want? Jesus can see him. Jesus knows what he needs. And still, he asks.\n\nBecause there is something important about saying the thing out loud. About naming the specific need to the specific God who can meet it.\n\n\"Rabbi, I want to see,\" Bartimaeus said. Six words. Completely honest. Exactly what he wanted, named plainly, without qualification or apology.\n\nMany of us have a prayer like that. Something we have circled around for a long time without quite writing it down. Something that feels too big, or too specific, or too much to ask for. But Bartimaeus was not modest. Hannah was not modest (1 Samuel 1:11). Jacob literally wrestled with God and would not let go until he received a blessing (Genesis 32:26).\n\nToday is the day for the prayer you have not written yet. Not because writing it guarantees the answer. But because bringing the real thing to God is an act of trust.",
    closing: "You said the thing. That took courage. He heard every word.",
  },
  {
    number: "Day Seven",
    subtitle: "Looking Back",
    tagline: "For the morning you take stock of what six days of showing up actually did.",
    verse: "This is the day the Lord has made; let us rejoice and be glad in it.",
    ref: "Psalm 118:24",
    reflection: "Look back at what you wrote across the six days before this one. What surprised you? What do you want to carry forward?",
    body: "In Joshua 4, after the Israelites had crossed the Jordan River on dry ground, God told Joshua to choose twelve men and have each of them carry a stone from the middle of the riverbed to the other side. The stones were to be set up as a memorial. When your children ask what do these stones mean, you will tell them that the waters of the Jordan were cut off before the ark of the covenant of the Lord. These stones are to be a memorial to the people of Israel forever (Joshua 4:6-7).\n\nGod built remembrance into the practice of His people deliberately and repeatedly. Not because He needed them to remember Him but because they needed to. Human beings are genuinely bad at holding onto the evidence of God's faithfulness once the moment passes and ordinary life resumes.\n\nThis journal is a small version of those stones. Seven days of showing up, of writing what was real, of bringing specific prayers to a specific God and leaving them there. It may not feel like much from the inside. Most faithful things do not feel like much from the inside.\n\nYou arrived on Day One from wherever you arrived from. You brought what was real on Day Two. You named what you are waiting for on Day Three. You practised gratitude on Day Four. You turned outward on Day Five. You wrote the prayer you had been carrying on Day Six.\n\nThat is six acts of turning toward God. Those are your stones. They are small and they are real and they belong to you.",
    closing: "You came back seven times. You can come back again.",
  },
];

function SevenDayPrayerJournal() {
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
              headline: "7-Day Prayer Journal Starter Kit",
              description: "Seven days of guided prayer journal prompts grounded in Scripture. For anyone beginning a prayer journaling practice, or beginning again.",
              author: { "@type": "Organization", name: "GraceNotes Daily" },
              publisher: {
                "@type": "Organization",
                name: "GraceNotes Daily",
                logo: { "@type": "ImageObject", url: "https://www.gracenotesdaily.com/icons/icon-512.png" },
              },
              url: "https://www.gracenotesdaily.com/7-day-prayer-journal",
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
                { "@type": "ListItem", position: 3, name: "7-Day Prayer Journal Starter Kit", item: "https://www.gracenotesdaily.com/7-day-prayer-journal" },
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
          <BackHomeButton />
        ) : (
          <Link to="/login" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
        )}
      </header>

      <article className="px-6 py-16 relative z-10">
        <div className="max-w-2xl mx-auto">

          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-4 text-center">Guide</p>
          <h1 className="font-display text-4xl md:text-5xl text-white drop-shadow mb-6 text-center leading-tight">
            7-Day Prayer Journal Starter Kit
          </h1>
          <p className="text-white/70 text-center text-sm mb-4 italic">A GraceNotes Daily Guide</p>
          <p className="text-white/75 text-center max-w-lg mx-auto mb-12 leading-relaxed">
            You do not need to be ready. You need seven mornings and a willingness to show up to them honestly. That is enough. That has always been enough.
          </p>

          <div className="space-y-8">
            {days.map((day) => (
              <section key={day.number} className="glass-parchment rounded-2xl p-8">
                <div className="mb-6">
                  <p className="text-gold text-sm font-semibold uppercase tracking-wider mb-1">{day.number}</p>
                  <h2 className="font-display text-2xl text-white mb-1">{day.subtitle}</h2>
                  <p className="text-white/80 text-sm italic">{day.tagline}</p>
                </div>

                <div className="text-white/80 leading-relaxed space-y-3 mb-6">
                  {day.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>

                <blockquote className="border-l-2 border-gold/50 pl-4 mb-6">
                  <p className="text-white/90 italic leading-relaxed">"{day.verse}"</p>
                  <p className="text-gold/80 text-sm mt-1">{day.ref}</p>
                </blockquote>

                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-white/80 text-xs uppercase tracking-wider mb-2">Today's reflection</p>
                  <p className="text-white/80 text-sm italic leading-relaxed">{day.reflection}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <p className="text-white/80 text-xs uppercase tracking-wider mb-2">Your prayer today</p>
                  <p className="text-white/75 text-sm italic">Open GraceNotes Daily to write your prayer in your private journal.</p>
                </div>

                <p className="text-white/80 text-sm italic text-center">{day.closing}</p>
              </section>
            ))}
          </div>

          {isLoggedIn ? (
            <div className="mt-12">
              <BackHomeCard variant="guide" />
            </div>
          ) : (
            <div className="mt-12 glass-on-hue rounded-2xl p-8 text-center">
              <DoveMark variant="medallion" className="w-14 h-14 mx-auto mb-4" />
              <h3 className="font-display text-2xl text-white mb-3">Continue the practice in GraceNotes Daily</h3>
              <p className="text-white/75 mb-6 text-sm leading-relaxed max-w-md mx-auto">
                The best of this practice is still ahead of you. GraceNotes Daily holds a prayer journal, daily grace notes, devotionals, and heart notes, all in one private, quiet space.
              </p>
              <Link to="/login" className="inline-block px-8 py-3 rounded-full bg-gold text-white font-semibold hover:bg-gold/90 transition">Welcome in</Link>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-white/75 text-sm">
              More guides:{" "}
              <Link to="/free-prayer-toolkit" className="text-gold underline">The Effective Prayer Toolkit</Link>
              {" "}·{" "}
              <Link to="/fasting-guide" className="text-gold underline">A Guide to Fasting</Link>
            </p>
          </div>

        </div>
      </article>

      <SiteFooter />
    </>
  );
}
