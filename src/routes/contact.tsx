import { createFileRoute, Link } from "@tanstack/react-router";
import { NatureBackground } from "@/components/nature-background";
import { SiteFooter } from "@/components/site-footer";
import { Heart, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const [sent, setSent] = useState(false);
  return (
    <>
      <NatureBackground />
      <header className="px-6 py-5 flex items-center justify-between text-white relative z-10">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="w-5 h-5 fill-current" />
          <span className="font-display text-2xl">GraceNotes Daily</span>
          <span className="text-gold"></span>
        </Link>
      </header>

      <section className="px-6 py-16">
        <div className="max-w-xl mx-auto glass rounded-3xl p-10 text-foreground">
          <Mail className="w-7 h-7 text-grace mb-3" />
          <h1 className="font-display text-4xl text-grace mb-2">Say hello</h1>
          <p className="text-foreground/70 mb-6">We read every message - gently, and with care.</p>

          {sent ? (
            <p className="rounded-2xl bg-grace-soft p-5 text-grace font-medium">Thank you. We'll be in touch</p>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSent(true); toast.success("Message received"); }}
              className="space-y-3"
            >
              <input required placeholder="Your name" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
              <input required type="email" placeholder="Email" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace" />
              <textarea required rows={5} placeholder="What's on your heart?" className="w-full px-4 py-3 rounded-2xl bg-white/80 border border-border focus:outline-none focus:ring-2 focus:ring-grace resize-none" />
              <button className="w-full py-3 rounded-full bg-grace text-white font-semibold">Send</button>
            </form>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
