import { Link } from "@tanstack/react-router";
import { DoveMark } from "@/components/dove-mark";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/20 bg-grace text-white/90">
      <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <div>
          <div className="flex items-center gap-2 text-white">
            <DoveMark variant="medallion" className="w-10 h-10" />
            <span className="font-display text-2xl">GraceNotes Daily</span>
            <span className="text-gold"></span>
          </div>
          <p className="text-sm text-white/70 mt-3 max-w-xs">
            A soft, daily companion for your walk with God - gentle reflections, prayer, and presence.
          </p>
        </div>

        <FooterColumn title="Product">
          <FooterLink to="/">Home</FooterLink>
          <FooterLink to="/faq">FAQ</FooterLink>
          <FooterLink to="/signup">Get started</FooterLink>
          <FooterLink to="/login">Sign in</FooterLink>
        </FooterColumn>

        <FooterColumn title="Notes & Letters">
          <FooterLink to="/library">All articles</FooterLink>
          <FooterLink to="/library/prayer-journaling">Prayer Journaling</FooterLink>
          <FooterLink to="/library/daily-devotional">Daily Devotional</FooterLink>
          <FooterLink to="/library/christian-journaling">Christian Journaling</FooterLink>
        </FooterColumn>

        <FooterColumn title="Tools">
          <FooterLink to="/quiet-time-app">Quiet Time App</FooterLink>
          <FooterLink to="/faith-habit-tracker">Faith Habit Tracker</FooterLink>
          <FooterLink to="/answered-prayer-tracker">Answered Prayer Tracker</FooterLink>
        </FooterColumn>

        <FooterColumn title="Guides">
          <FooterLink to="/free-prayer-toolkit">The Effective Prayer Toolkit</FooterLink>
          <FooterLink to="/fasting-guide">A Guide to Fasting</FooterLink>
          <FooterLink to="/7-day-prayer-journal">7-Day Prayer Journal</FooterLink>
        </FooterColumn>

        <FooterColumn title="Company">
          <FooterLink to="/about">About</FooterLink>
          <FooterLink to="/contact">Contact</FooterLink>
        </FooterColumn>

        <FooterColumn title="Legal">
          <FooterLink to="/privacy">Privacy</FooterLink>
          <FooterLink to="/terms">Terms</FooterLink>
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-white/80 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} GraceNotes Daily</span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">{title}</h4>
      <ul className="space-y-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="text-white/75 hover:text-gold transition">
        {children}
      </Link>
    </li>
  );
}
