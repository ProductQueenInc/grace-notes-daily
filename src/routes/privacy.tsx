import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Heart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy - GraceNotes Daily" },
      { name: "description", content: "Privacy policy for GraceNotes Daily. Your heart, prayers, and reflections stay yours." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center text-white relative z-10">
        <Link to="/" className="flex items-center gap-2"><Heart className="w-5 h-5 fill-current" /><span className="font-display text-2xl">GraceNotes Daily</span></Link>
      </header>
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 text-foreground space-y-4">
          <ShieldCheck className="w-7 h-7 text-grace" />
          <h1 className="font-display text-4xl text-grace">Privacy Policy</h1>
          <p className="text-sm text-foreground/55">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p className="text-foreground/75 leading-relaxed">Your heart notes, prayers, and reflections are private to your account. We never sell your data and we never share it without your explicit consent.</p>
          <h2 className="font-display text-2xl text-grace mt-6">What we collect</h2>
          <p className="text-foreground/75 leading-relaxed">Your name, email, faith phase, and the content you choose to write inside the app. We use this to personalize your daily grace note and remember your journey.</p>
          <h2 className="font-display text-2xl text-grace mt-6">How we protect it</h2>
          <p className="text-foreground/75 leading-relaxed">All data is encrypted in transit and at rest. You can delete your account and all associated data at any time from Settings.</p>
          <h2 className="font-display text-2xl text-grace mt-6">Third parties</h2>
          <p className="text-foreground/75 leading-relaxed">We use trusted providers for authentication, storage, and AI generation. We never give them more than is needed to serve you.</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
