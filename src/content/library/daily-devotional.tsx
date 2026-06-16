export const faqs = [
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

export function Body() {
  return (
    <>
      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <p className="text-foreground/80 leading-relaxed text-lg">
          The problem isn't not wanting to spend time with God.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Most people want more of it. The problem is the morning itself, when everything else arrives first and the good intention from yesterday doesn't automatically come with a plan for today.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          A daily devotional practice is what fills that gap. Not by adding something to your morning, but by giving your morning somewhere to begin.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">The one thing they wouldn't give up</h2>
        <p className="text-foreground/75 leading-relaxed">
          Jesus was in the middle of the most consequential ministry in human history. People followed him everywhere. He was healing, teaching, confronting religious leaders and being confronted in return. His schedule had no empty space. And yet Luke 5:16 records this almost as a side note:
        </p>
        <blockquote className="border-l-2 border-gold pl-5 py-1">
          <p className="text-foreground/80 italic leading-relaxed">"But Jesus often withdrew to lonely places and prayed."</p>
          <cite className="text-gold text-sm font-semibold not-italic mt-1 block">Luke 5:16</cite>
        </blockquote>
        <p className="text-foreground/75 leading-relaxed">
          Often. Not occasionally. Not when the schedule permitted. If anyone had reason to skip the quiet time in favour of the work, it was Jesus. And still, withdrawing to be with the Father was the thing he wouldn't give up. Not because he was performing devotion for anyone watching. Because everything he was doing flowed from those hours alone with God.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          In Daniel 6, the situation was considerably more dramatic. Daniel was living under a king who had outlawed prayer to any god other than himself, with death by lion as the consequence. When the law was signed, Daniel went to his upstairs room, opened his windows toward Jerusalem, got on his knees, and prayed three times. Just as he had done before.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Just as he had done before. The decree changed nothing about his practice because the practice wasn't built on favourable conditions. It was built on his relationship with God, and that relationship didn't negotiate around threats.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Both stories are about people who understood that what they did every day shaped who they were when it mattered. The practice wasn't separate from the ministry. It was the source of it.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">What tends to happen over time</h2>
        <p className="text-foreground/75 leading-relaxed">
          The daily habit, if you build it, becomes the anchor of your day. Not because it takes long, nor because it requires anything elaborate, but because consistency with God builds something that nothing else does: a quieter certainty, a growing sense of what you actually believe, not just what you're supposed to.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Six months from now, if you've been showing up, you'll look back and find that you are different in quiet ways. More settled. More patient. The kind of different that is hard to point to but unmistakable once you notice it. That's what daily time with God does, slowly, without fanfare, mostly on the ordinary mornings.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          The mornings you miss it, you'll notice. Busier in the head. More reactive. Less grounded. That difference is worth paying attention to, because it tells you something real about what that time has actually been doing, even on the mornings when it didn't feel like much.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">On getting started</h2>
        <p className="text-foreground/75 leading-relaxed">
          You don't need an hour. Ten focused minutes, given fully, will do more for your faith than an hour spent half-present. Start where you actually are, not where you think you should be.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Consistency matters more than perfection. Missing a day doesn't erase a practice; it's just a day you missed. The question is always the same: will you come back tomorrow?
        </p>
        <p className="text-foreground/75 leading-relaxed">
          The hardest part isn't the content. It's the decision to begin. Once you sit down, most people find they want to stay longer than they planned.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">A place to begin each morning</h2>
        <p className="text-foreground/75 leading-relaxed">
          Each morning in GraceNotes Daily, there's a grace note waiting: a verse, a reflection, a prompt drawn from where you are in your faith. A short devotional to sit with and carry into the day. Space to write a prayer. Space to write what's on your mind. And a quiet record building in the background of every morning you show up.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Over time, that record becomes something meaningful: a personal history of your walk with God, one ordinary morning at a time.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10">
        <p className="text-foreground/70 leading-relaxed text-center italic font-display text-xl">
          You don't need a plan or a perfect set-up.{" "}
          <a href="/home" className="text-grace underline underline-offset-4">Come on in.</a>
        </p>
      </div>
    </>
  );
}
