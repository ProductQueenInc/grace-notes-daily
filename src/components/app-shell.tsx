import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sun,
  Headphones,
  Compass,
  Menu,
  NotebookPen,
  BookOpen,
  HandHeart,
  Settings as SettingsIcon,
  LogOut,
  X,
  Flame,
} from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useStreak } from "@/hooks/use-streak";

import { PlayerDock } from "@/components/player-dock";
import { Icon } from "@/components/icon";
import { SystemBanner } from "@/components/system-banner";
import { supabase, supabaseConfigured } from "@/lib/supabase";

const MOBILE_TABS = [
  { to: "/home", label: "Home", icon: Sun },
  { to: "/heart-notes", label: "Heart Notes", icon: NotebookPen },
  { to: "/prayers", label: "Prayers", icon: HandHeart },
] as const;

const DRAWER_ITEMS = [
  { to: "/journey", label: "Journey", icon: Compass },
  { to: "/library", label: "Notes & Letters", icon: BookOpen },
] as const;

const DRAWER_FOOTER_ITEMS = [
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const streak = useStreak();

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
          {/* Floating streak chip — mobile only, top-right, safe-area aware */}
          <div
            className="md:hidden fixed top-0 right-0 z-30 pr-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          >
            <div className="glass-on-hue rounded-full h-10 px-3 inline-flex items-center gap-1.5 text-white/90 text-xs font-medium">
              <Icon icon={Flame} size="sm" className="text-gold" />
              {streak} {streak === 1 ? "day" : "days"}
            </div>
          </div>

          <main
            className="flex-1 fade-up md:pb-12"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 6.5rem)" }}
          >
            <SystemBanner />
            {children}
          </main>


          {/* Mobile bottom tab bar — respects iOS home-indicator */}
          <nav
            className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
          >
            <div className="glass-on-hue rounded-2xl">
              <div className="grid grid-cols-4">
                {MOBILE_TABS.map((item) => {
                  const active = location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-[11px] leading-none ${
                        active ? "text-gold" : "text-white/75"
                      }`}
                    >
                      <Icon icon={item.icon} size="md" tone={active ? "active" : "inherit"} />
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  onClick={() => setMenuOpen(true)}
                  className="flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-[11px] leading-none text-white/75"
                >
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
                <div className="flex-1 flex flex-col gap-1">
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
                </div>
                <div className="border-t border-white/15 pt-2 mt-2 flex flex-col gap-1">
                  {DRAWER_FOOTER_ITEMS.map((it) => (
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
            </div>
          )}

          <PlayerDock />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
