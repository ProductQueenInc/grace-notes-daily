import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Mail } from "lucide-react";
import { DoveMark } from "@/components/dove-mark";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - GraceNotes Daily" },
      { name: "description", content: "Reach out to the GraceNotes Daily team. We'd love to hear from you." },
      { property: "og:title", content: "Contact GraceNotes Daily" },
    ],
  }),
  component: Contact,
});

function Contact() {
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <DoveMark variant="white" className="w-10 h-10" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
          <span className="text-gold"></span>
        </Link>
      </header>

      <section className="px-6 py-16">
        <div className="max-w-xl mx-auto glass rounded-3xl p-10 text-foreground">
          <Mail className="w-7 h-7 text-grace mb-3" />
          <h1 className="font-display text-4xl text-grace mb-2">Say hello</h1>
          <p className="text-foreground/70 mb-3">We read every message - gently, and with care.</p>
          <p className="text-foreground/60 text-sm mb-8 leading-relaxed">
            Whether you have a question, a thought, or something on your heart — we'd love to hear from you.
          </p>
          <button
            data-tally-open="VL4NY6"
            data-tally-width="374"
            data-tally-emoji-text="👋"
            data-tally-emoji-animation="wave"
            data-tally-form-events-forwarding="1"
            className="w-full py-3 rounded-full bg-grace text-white font-semibold hover:opacity-95 transition cursor-pointer"
          >
            Send us a message
          </button>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
