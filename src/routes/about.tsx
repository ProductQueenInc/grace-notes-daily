import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Sparkles } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About - GraceNotes Daily" },
      { name: "description", content: "GraceNotes Daily is a gentle, faith-based companion built to help you walk softly with God every day." },
      { property: "og:title", content: "About GraceNotes Daily" },
      { property: "og:description", content: "A soft, daily companion for your walk with God." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="w-5 h-5 fill-current" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
          <span className="text-gold"></span>
        </Link>
        <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
      </header>

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 md:p-14 text-foreground">
          <Sparkles className="w-7 h-7 text-gold mb-4" />
          <h1 className="font-display text-4xl md:text-5xl text-grace mb-4">About GraceNotes Daily</h1>
          <p className="text-foreground/75 leading-relaxed mb-4">
            GraceNotes Daily is a soft, daily companion for your walk with God. We believe faith should feel like rest,
            not performance - like being held, not pushed.
          </p>
          <p className="text-foreground/75 leading-relaxed mb-4">
            Every morning, you'll receive a grace note written gently for you, an invitation to journal your heart, a
            place to hold your prayers, and a daily devotional to anchor your day. No streak shaming. No noise.
            Just presence.
          </p>
          <p className="text-foreground/75 leading-relaxed">
            We're a small team building this with love - and a deep belief that grace is the most beautiful word in the
            English language.
          </p>

          <div className="mt-8 flex gap-3">
            <Link to="/signup" className="px-6 py-3 rounded-full bg-grace text-white font-semibold">Begin your journey</Link>
            <Link to="/contact" className="px-6 py-3 rounded-full glass text-grace font-semibold">Contact us</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
