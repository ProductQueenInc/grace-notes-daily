import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sun,
  Headphones,
  Compass,
  Menu,
  NotebookPen,
  HandHeart,
  Settings as SettingsIcon,
  LogOut,
  X,
} from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import { PlayerDock } from "@/components/player-dock";
import { Icon } from "@/components/icon";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const MOBILE_TABS = [
  { to: "/home", label: "Home", icon: Sun },
  { to: "/listen", label: "Listen", icon: Headphones },
  { to: "/journey", label: "Journey", icon: Compass },
] as const;

const DRAWER_ITEMS = [
  { to: "/heart-notes", label: "Heart Notes", icon: NotebookPen },
  { to: "/prayers", label: "Prayers", icon: HandHeart },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function signOut() {
    if (supabaseConfigured) await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4.75rem" } as React.CSSProperties}>
      <div className="min-h-screen flex w-full">
        {/* Desktop sidebar (hidden on mobile via shadcn) */}
        <AppSidebar />

        <SidebarInset className="bg-transparent">
          {/* Desktop top bar removed - sidebar holds nav/profile/streak */}

          {/* Mobile top bar */}
          <header className="md:hidden sticky top-0 z-30 px-3 pt-3">
            <div className="glass-on-hue rounded-2xl h-12 flex items-center justify-between px-3">
              <button onClick={() => setMenuOpen(true)} className="p-1.5 text-white/85" aria-label="Menu">
                <Icon icon={Menu} size="nav" />
              </button>
              <Link to="/home" className="font-display text-lg text-white">GraceNotes Daily</Link>
              <Link to="/settings" className="w-8 h-8 rounded-full bg-gold/90 text-gold-foreground flex items-center justify-center text-sm font-semibold">
                G
              </Link>
            </div>
          </header>

          <main className="flex-1 fade-up pb-28 md:pb-12">{children}</main>

          {/* Mobile bottom tab bar */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3">
            <div className="glass-on-hue rounded-2xl">
              <div className="grid grid-cols-4">
                {MOBILE_TABS.map((item) => {
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${
                        active ? "text-gold" : "text-white/75"
                      }`}
                    >
                      <Icon icon={item.icon} size="md" tone={active ? "active" : "inherit"} />
                      {item.label}
                    </Link>
                  );
                })}
                <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-white/75">
                  <Icon icon={Menu} size="md" />
                  Menu
                </button>
              </div>
            </div>
          </nav>

          {/* Mobile drawer */}
          {menuOpen && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
              <div className="absolute left-0 top-0 bottom-0 w-72 glass-on-hue shadow-2xl p-6 flex flex-col gap-1 fade-up">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-display text-xl text-white">GraceNotes Daily</span>
                  <button onClick={() => setMenuOpen(false)} className="text-white/80">
                    <Icon icon={X} size="md" />
                  </button>
                </div>
                {DRAWER_ITEMS.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setMenuOpen(false)}
                    className="px-3 py-3 rounded-xl hover:bg-white/10 text-white/90 flex items-center gap-3"
                  >
                    <Icon icon={it.icon} size="md" /> {it.label}
                  </Link>
                ))}
                <button
                  onClick={signOut}
                  className="px-3 py-3 rounded-xl hover:bg-white/10 text-white/90 flex items-center gap-3 text-left"
                >
                  <Icon icon={LogOut} size="md" /> Sign out
                </button>
              </div>
            </div>
          )}

          <PlayerDock />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
