import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Heart, BookOpen } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — GraceNotes Daily" },
      { name: "description", content: "Terms of use for GraceNotes Daily." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center text-white relative z-10">
        <Link to="/" className="flex items-center gap-2"><Heart className="w-5 h-5 fill-current" /><span className="font-display text-2xl">GraceNotes Daily</span></Link>
      </header>
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto glass rounded-3xl p-10 text-foreground space-y-4">
          <BookOpen className="w-7 h-7 text-grace" />
          <h1 className="font-display text-4xl text-grace">Terms of Use</h1>
          <p className="text-sm text-foreground/55">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p className="text-foreground/75 leading-relaxed">By using GraceNotes Daily you agree to use it with gentleness — toward yourself and others. The content provided is for personal spiritual reflection and isn't a substitute for community, pastoral guidance, or professional support.</p>
          <h2 className="font-display text-2xl text-grace mt-6">Your account</h2>
          <p className="text-foreground/75 leading-relaxed">You're responsible for keeping your account credentials safe. Please don't share your account with others.</p>
          <h2 className="font-display text-2xl text-grace mt-6">Content</h2>
          <p className="text-foreground/75 leading-relaxed">You own everything you write. By submitting content you grant us permission to store it solely to provide the service.</p>
          <h2 className="font-display text-2xl text-grace mt-6">Changes</h2>
          <p className="text-foreground/75 leading-relaxed">We may update these terms occasionally. We'll always tell you when something material changes.</p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
