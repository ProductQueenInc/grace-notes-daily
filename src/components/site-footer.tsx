import { Link } from "@tanstack/react-router";
import { DoveMark } from "@/components/dove-mark";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-white/20 bg-grace text-white/90">
      <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-white">
            <DoveMark variant="white" className="w-6 h-6" />
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
        <div className="max-w-7xl mx-auto px-6 py-5 text-xs text-white/60 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} GraceNotes Daily. Walk gently - you are loved.</span>
          <span className="flex items-center gap-1"><span className="text-gold"></span> Made with grace</span>
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
