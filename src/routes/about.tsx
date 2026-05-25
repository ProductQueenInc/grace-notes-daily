import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Sparkles } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About - GraceNotes Daily" },
      { name: "description", content: "GraceNotes Daily was built by Product Queen, a Nairobi-based product builder who came back to faith and couldn't find an app that met her gently. So she built one." },
      { property: "og:title", content: "About GraceNotes Daily" },
      { property: "og:description", content: "A soft, daily companion for your walk with God. Built by someone who needed it first." },
    ],
  }),
  component: About,
});

function About() {
  const { session, loading } = useAuth();
  const isLoggedIn = !loading && !!session;

  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="white" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
          <span className="text-gold"></span>
        </Link>
        {isLoggedIn ? (
          <Link to="/home" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Open app</Link>
        ) : (
          <Link to="/signup" className="px-4 py-2 rounded-full text-sm font-semibold bg-white text-grace">Get started</Link>
        )}
      </header>

      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* What the product is */}
          <div className="glass rounded-3xl p-10 md:p-14 text-foreground">
            <Sparkles className="w-7 h-7 text-gold mb-4" />
            <h1 className="font-display text-4xl md:text-5xl text-grace mb-4">About GraceNotes Daily</h1>
            <p className="text-foreground/75 leading-relaxed mb-4">
              GraceNotes Daily is a soft, daily companion for your walk with God. We believe faith should feel like rest,
              not performance. Like being held, not pushed.
            </p>
            <p className="text-foreground/75 leading-relaxed mb-4">
              Every morning, you'll receive a grace note written gently for you, an invitation to journal your heart, a
              place to hold your prayers, and a daily devotional to anchor your day. No streak shaming. No noise.
              Just presence.
            </p>
          </div>

          {/* Founder story */}
          <div className="glass-parchment rounded-3xl p-10 md:p-14 text-foreground space-y-5">
            <h2 className="font-display text-3xl text-grace">Why I built this</h2>

            <p className="text-foreground/75 leading-relaxed">
              My name is Cindy, a tech builder at Product Queen Inc. I build apps that solve a problem for me first, and hopefully for other people next.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              I created GraceNotes Daily because I had just returned to my Christian faith, and I was struggling to build
              the routine I needed to stay close to God. I would open my Bible and not know where to start. That uncertainty
              would derail me; I'd spend so much time figuring out what would speak to my spirit that day, often come up
              empty, and get distracted. I needed something that would meet me where I was, without requiring me to already
              know what I needed.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              I wanted to talk to God a bit more, and a bit more intentionally. After praying in the morning and listening
              to some gospel music, I wanted to sit down and tell God how my heart was feeling in that moment, and see
              what He had in mind for me. So I built something that could hold that conversation, track that journey, and
              let me feel like I was genuinely growing.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              The more GraceNotes Daily became a habit in my own day, the more I felt that other people would benefit
              from it too. So I built it for myself first, and I'm now building it for you.
            </p>

            <blockquote className="border-l-2 border-gold pl-5 py-1">
              <p className="text-foreground/80 italic leading-relaxed font-display text-lg">
                "My life's mission is to build beautiful products, beautiful experiences, and beautiful spaces.
                I hope this soul and beauty I tried to bring to GraceNotes Daily translates to you wherever
                you experience it for yourself. It has been the delight of my lifetime bringing this to life."
              </p>
            </blockquote>

            <p className="text-foreground/75 leading-relaxed">
              I have spent nine years working in tech, having transitioned from a background in law. I am based in Nairobi,
              Kenya, though I travel widely. Outside of building products, I am a student pilot, a tennis player, an artist,
              and a commercial interior designer;{" "}
              <a href="https://www.habitue.design" target="_blank" rel="noopener noreferrer" className="text-grace underline underline-offset-2 hover:text-grace-deep transition">Habitue.Design</a>{" "}
              is my interior design brand.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              My ultimate goal in all of it is to embody and manifest everything God had in mind for me when He created me.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              I work with a small, trusted team as this product grows. Everything we build here is held to one standard:
              that GraceNotes Daily remains a welcoming, soft, safe space for other Christians who simply want to be
              more intimate with their Father.
            </p>

            <p className="text-foreground/70 text-sm">
              Want to know more about the products I build?{" "}
              <a href="https://www.product-queen.com" target="_blank" rel="noopener noreferrer" className="text-grace underline underline-offset-2 hover:text-grace-deep transition">Visit product-queen.com</a>
            </p>
          </div>

          <div className="flex gap-3 px-1">
            {isLoggedIn ? (
              <Link to="/home" className="px-6 py-3 rounded-full bg-grace text-white font-semibold hover:opacity-95 transition">Open app</Link>
            ) : (
              <Link to="/signup" className="px-6 py-3 rounded-full bg-grace text-white font-semibold hover:opacity-95 transition">Begin your journey</Link>
            )}
            <Link to="/contact" className="px-6 py-3 rounded-full glass text-grace font-semibold hover:bg-white/80 transition">Say hello</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
