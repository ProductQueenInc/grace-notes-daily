import graceNotesPreview from "@/assets/home-previews/grace-notes-home.png.asset.json";
import listenPreview from "@/assets/home-previews/listen-home.png.asset.json";
import dailyRhythmsPreview from "@/assets/home-previews/daily-rhythms-home.png.asset.json";
import heartNotesPreview from "@/assets/home-previews/heart-notes-home.png.asset.json";
import prayerPreview from "@/assets/home-previews/prayer-home.png.asset.json";
import journeyPreview from "@/assets/home-previews/journey-home.png.asset.json";

type PreviewItem = {
  title: string;
  eyebrow: string;
  description: string;
  imageUrl: string;
  alt: string;
};

const previewRows: PreviewItem[][] = [
  [
    {
      title: "Grace Notes",
      eyebrow: "Daily encouragement",
      description: "A quiet word to begin the day with steadiness, truth, and grace.",
      imageUrl: graceNotesPreview.url,
      alt: "GraceNotes Daily grace note mockup on a green leaf background",
    },
    {
      title: "Listen",
      eyebrow: "Music and prayer",
      description: "Worship and reflective audio in a calm, uncluttered listening space.",
      imageUrl: listenPreview.url,
      alt: "GraceNotes Daily listen player mockup on a green leaf background",
    },
    {
      title: "Daily Rhythms",
      eyebrow: "Streak and snapshot",
      description: "See your day, your momentum, and each gold day at a glance.",
      imageUrl: dailyRhythmsPreview.url,
      alt: "GraceNotes Daily daily rhythms mockup on a green background",
    },
  ],
  [
    {
      title: "Heart Notes",
      eyebrow: "Daily journaling",
      description: "A gentle place to pour out what is on your heart without pressure.",
      imageUrl: heartNotesPreview.url,
      alt: "GraceNotes Daily heart notes mockup on a warm desk background",
    },
    {
      title: "Prayer Tracker",
      eyebrow: "Active and answered",
      description: "Hold your prayers in one place and remember what God has already done.",
      imageUrl: prayerPreview.url,
      alt: "GraceNotes Daily prayer tracker mockup on a cream linen background",
    },
    {
      title: "Journey",
      eyebrow: "Your story",
      description: "Return to milestones, answered prayers, and the shape of your growth.",
      imageUrl: journeyPreview.url,
      alt: "GraceNotes Daily journey archive mockup on a warm stone background",
    },
  ],
];

function PreviewCard({ item }: { item: PreviewItem }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-sm shadow-[0_20px_60px_rgba(9,24,15,0.18)] transition duration-300 hover:-translate-y-1 hover:bg-white/14">
      <div className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-[24px] bg-white/5 ring-1 ring-white/10">
          <img
            src={item.imageUrl}
            alt={item.alt}
            loading="lazy"
            className="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.015]"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {item.eyebrow}
        </p>
        <h3 className="mt-2 font-display text-[1.9rem] leading-none text-white sm:text-[2.1rem]">
          {item.title}
        </h3>
        <p className="mt-3 max-w-[30ch] text-sm leading-relaxed text-white/82 sm:text-[15px]">
          {item.description}
        </p>
      </div>
    </article>
  );
}

function PreviewRow({ items, mobileLabel }: { items: PreviewItem[]; mobileLabel: string }) {
  return (
    <>
      <div className="sm:hidden">
        <div className="px-6 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/65">
            {mobileLabel}
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <div key={item.title} className="min-w-[82vw] snap-start">
              <PreviewCard item={item} />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-3 gap-5 lg:gap-6">
        {items.map((item) => (
          <PreviewCard key={item.title} item={item} />
        ))}
      </div>
    </>
  );
}

export function HomeFeaturePreviews() {
  return (
    <div className="max-w-6xl mx-auto">
      <PreviewRow items={previewRows[0]} mobileLabel="Explore the app" />
      <div className="hidden sm:block h-6 lg:h-8" />
      <PreviewRow items={previewRows[1]} mobileLabel="Write, pray, remember" />
    </div>
  );
}
