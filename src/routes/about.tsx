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
            <h2 className="font-display text-3xl text-grace">Why I Built This</h2>

            <p className="text-foreground/75 leading-relaxed">
              My name is Cindy, a tech builder at{" "}
              <a href="https://www.product-queen.com" target="_blank" rel="noopener noreferrer" className="text-grace underline underline-offset-2 hover:text-grace-deep transition">Product Queen Inc.</a>{" "}
              I build products that solve a problem I have first, and then share them publicly if they turn out useful beyond my close friends and family.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              The urge to build GraceNotes Daily was unrelenting; it practically begged to exist. Every morning after I
              found my way back to my Christian faith, it would sit heavily on my heart.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              I was struggling to build the routine I needed to stay close to God. I would open my Bible and not know
              where to start. That uncertainty would derail me; I'd spend so much time trying to figure out what might
              speak to my spirit that day that I'd often get distracted or come up empty altogether. I needed something
              that would meet me where I was, without requiring me to already know what I needed.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              I wanted to talk to God more intentionally. After praying in the morning and listening to gospel music, I
              found myself wanting a space where I could sit down, tell God honestly how my heart felt in that moment, and
              reflect on what He might be trying to show me. So I built something that could hold that conversation, track
              that journey, and help me feel like I was genuinely growing in faith instead of just trying to "be disciplined."
            </p>

            <p className="text-foreground/75 leading-relaxed">
              The more GraceNotes Daily became part of my own life, the more I felt other people might need it too. So I
              built it for myself first, and now I'm building it for you.
            </p>

            <blockquote className="border-l-2 border-gold pl-5 py-1">
              <p className="text-foreground/80 italic leading-relaxed font-display text-lg">
                "My life's mission is to build beautiful products, beautiful experiences, and beautiful spaces. I hope
                the soul and care I tried to pour into GraceNotes Daily reaches you wherever you experience it for
                yourself. Bringing this to life has genuinely been one of the great delights of my life."
              </p>
            </blockquote>

            <p className="text-foreground/75 leading-relaxed">
              I've spent the last 9 years working in tech after transitioning from a background in law. I'm deeply
              multi-passionate and endlessly curious, and I spend a lot of my time travelling across Africa and Europe
              exploring the different gifts God has placed in my life.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              Beyond tech, I'm also a student pilot, tennis player, artist, and commercial interior designer at{" "}
              <a href="https://www.habitue.design" target="_blank" rel="noopener noreferrer" className="text-grace underline underline-offset-2 hover:text-grace-deep transition">Habitue.Design</a>.
              My ultimate goal is simple: to fully become everything God had in mind when He created me.
            </p>

            <p className="text-foreground/75 leading-relaxed">
              As GraceNotes Daily grows, I work with a small and trusted team to bring it to life thoughtfully. Everything
              we build is held to one standard: that this remains a soft, welcoming, safe space for Christians who simply
              want to grow closer to their Father.
            </p>

            <p className="text-foreground/70 text-sm">
              Want to explore more of the products I build? Visit{" "}
              <a href="https://www.product-queen.com" target="_blank" rel="noopener noreferrer" className="text-grace underline underline-offset-2 hover:text-grace-deep transition">Product Queen</a>.
            </p>
          </div>

        </div>
      </section>

      <SiteFooter />
    </>
  );
}
