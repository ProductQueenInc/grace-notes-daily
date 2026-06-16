export const faqs = [
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
    a: "As specific as you can make them. Specific prayers are easier to recognise when they are answered, which builds faith over time. That said, write what is real to you first. Specificity can grow as the practice does.",
  },
];

export function Body() {
  return (
    <>
      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <p className="text-foreground/80 leading-relaxed text-lg">
          Something special happens when you write a prayer down.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          It slows you down just enough to mean it. That thing you've been carrying for days without quite naming it becomes real when you write it. Something you gave to God on purpose, not just in passing.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          There's no format to get it right, nor is any particular level of faith required. Showing up with what is real is the whole practise.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          If you've never tried it, consider this an open invitation rather than a standard to measure yourself against. If you've tried and drifted, that's not failure. It's just where you are, and here is a place to start again.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">The prayers that changed things were specific ones</h2>
        <p className="text-foreground/75 leading-relaxed">
          The Bible is not short on stories about what happens when someone stops and actually prays, not as a formality, but as a real conversation with a God who listens and responds.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          In Acts 12, Peter was in prison, awaiting execution. The church gathered and prayed through the night. While they were still praying, an angel appeared in his cell. The chains fell off his hands. The prison doors opened on their own. Peter walked out and made his way to the house where the believers were gathered. When he knocked, a servant girl recognised his voice and ran back to tell the others, who told her she was imagining things. They were still praying for his release when the answer was standing at the door.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          That story is not there to impress us. It is there to remind us what prayer is actually capable of.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Hannah's prayer in 1 Samuel 1 is one of the most searingly personal in all of Scripture. She desperately wanted a child and had been unable to conceive. She went to the temple and prayed with such raw grief that the priest watching her thought she was drunk. She was not performing. She was talking to God about the one thing she wanted most, in exactly the words she had for it. God heard her. She conceived and gave birth to Samuel, one of the most significant figures in Israel's history.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Neither prayer came from a perfect person doing it perfectly. Both came from someone specific, with a specific need, who brought what was real to a God who was paying attention.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">Why writing it down is different from thinking it</h2>
        <p className="text-foreground/75 leading-relaxed">
          Long before journaling became a wellness practice, God's people were writing things down.
        </p>
        <div className="space-y-4 my-2">
          {[
            { verse: "Write down the revelation and make it plain on tablets so that a herald may run with it.", ref: "Habakkuk 2:2" },
            { verse: "I remember the days of long ago; I meditate on all your works and consider what your hands have done.", ref: "Psalm 143:5" },
          ].map((s) => (
            <blockquote key={s.ref} className="border-l-2 border-gold pl-5 py-1">
              <p className="text-foreground/80 italic leading-relaxed">"{s.verse}"</p>
              <cite className="text-gold text-sm font-semibold not-italic mt-1 block">{s.ref}</cite>
            </blockquote>
          ))}
        </div>
        <p className="text-foreground/75 leading-relaxed">
          Writing a prayer names a thing, and it makes it specific. And specific prayers are the ones you can look back on one day and recognise that they have been answered.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          A prayer that says <em>Lord, help things get better</em> is honest, but it is hard to know when it has been answered. A prayer that says <em>Lord, I need a job by the end of this month, I am afraid, and I am trusting you</em> gives you something to return to. It gives God something to answer in a way you can see.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          Write what you actually want. Not what sounds appropriately humble or sufficiently spiritual. God is not waiting for you to scale back your faith before He responds. The prayer that feels too big, too specific, too much to ask is often the one most worth writing.
        </p>
        <blockquote className="border-l-2 border-gold pl-5 py-1 my-2">
          <p className="text-foreground/80 italic leading-relaxed">"Ask and it will be given to you; seek and you will find; knock and the door will be opened to you."</p>
          <cite className="text-gold text-sm font-semibold not-italic mt-1 block">Matthew 7:7</cite>
        </blockquote>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">What tends to happen over time</h2>
        <p className="text-foreground/75 leading-relaxed">
          A few months from now, if you have been writing, you will scroll back through your prayers and find something you forgot you prayed. And you will see that it was answered. Not always in the way you expected. But answered.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          For those just starting out who are not sure what the right words are: there are no right words. God receives what you actually feel more than what you think you are supposed to say. Hannah did not compose her prayer carefully. She poured it out.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          For those who have been writing their prayers for years, you already know this. You have the evidence.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10 space-y-5">
        <h2 className="font-display text-3xl text-grace">A place to hold all of it</h2>
        <p className="text-foreground/75 leading-relaxed">
          The prayer space in GraceNotes Daily is built around exactly this: specific prayers, kept privately, searchable over time. As prayers are answered, you mark them. Over months, the answered prayer journal becomes something extraordinary: a living record of God's faithfulness in your own life. Not a testimony you heard. Your own.
        </p>
        <p className="text-foreground/75 leading-relaxed">
          The prayers still waiting live there too, the ones you return to, add to, and sit with. Nothing gets lost.
        </p>
      </div>

      <div className="glass-parchment rounded-3xl p-8 md:p-10">
        <p className="text-foreground/70 leading-relaxed text-center italic font-display text-xl">
          You don't need a quiet house or the right words or a set amount of time.{" "}
          <a href="/home" className="text-grace underline underline-offset-4">Come on in.</a>
        </p>
      </div>
    </>
  );
}
