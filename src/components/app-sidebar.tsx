import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sun,
  NotebookPen,
  HandHeart,
  Headphones,
  Compass,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Flame,
  ChevronUp,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icon } from "@/components/icon";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStreak } from "@/hooks/use-streak";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/home", label: "Today", icon: Sun },
  { to: "/heart-notes", label: "Heart Notes", icon: NotebookPen },
  { to: "/prayers", label: "Prayers", icon: HandHeart },
  { to: "/listen", label: "Listen", icon: Headphones },
  { to: "/journey", label: "Journey", icon: Compass },
] as const;

const PIN_KEY = "gn:sidebar:pinned";

export function AppSidebar() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { state, setOpen, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, user } = useAuth();

  const displayName = profile?.name || user?.email?.split("@")[0] || "Friend";
  const initial = displayName.charAt(0).toUpperCase();
  const streak = useStreak();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(PIN_KEY);
    setOpen(saved === null ? true : saved === "1");
  }, [setOpen]);

  function togglePin() {
    const next = state === "collapsed";
    if (typeof window !== "undefined") {
      localStorage.setItem(PIN_KEY, next ? "1" : "0");
    }
    toggleSidebar();
  }

  async function signOut() {
    if (supabaseConfigured) await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-2 py-4 flex items-center justify-center">
        <Link to="/home" className={`flex items-center gap-2 ${collapsed ? "justify-center" : "px-1"}`}>
          {/* Home medallion — sacred anchor, intentionally larger than all other icons */}
          <span className="w-11 h-11 aspect-square rounded-full bg-gold/90 text-gold-foreground flex items-center justify-center font-display text-xl shadow-soft shrink-0 ring-2 ring-gold/30">
            G
          </span>
          {!collapsed && (
            <span className="font-display text-lg text-white tracking-tight">GraceNotes Daily</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className="relative data-[active=true]:bg-white/12 data-[active=true]:text-white hover:bg-white/8 hover:text-white text-white/70 transition-all duration-200"
                    >
                      <Link to={item.to} className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                        {active && !collapsed && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gold" />
                        )}
                        {active && collapsed && (
                          <span className="absolute inset-0 rounded-md ring-1 ring-gold/40 bg-white/10" />
                        )}
                        <Icon icon={item.icon} size="nav" tone={active ? "active" : "inherit"} className="relative z-10" />
                        <span className="relative z-10">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 gap-1">
        {/* Streak — visible even when sidebar is collapsed */}
        <div
          title={`${streak} day streak`}
          className={`flex items-center rounded-md py-1.5 text-white/85 ${
            collapsed ? "justify-center gap-1 px-0" : "gap-2 px-2"
          }`}
        >
          <Icon icon={Flame} size="nav" className="text-gold shrink-0" tone="inherit" />
          <span className="font-semibold text-gold text-sm leading-none">{streak}</span>
          {!collapsed && <span className="text-white/70 text-sm leading-none">day streak</span>}
        </div>

        <SidebarMenu>
          {/* Collapse / expand */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={togglePin}
              tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="text-white/70 hover:bg-white/8"
            >
              <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} size="md" />
              <span>Collapse</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User profile with nested Settings + Sign out */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={displayName}
                  className={`text-white/90 hover:bg-white/10 data-[state=open]:bg-white/10 ${
                    collapsed ? "h-10 justify-center" : "h-12"
                  }`}
                >
                  <span className="w-8 h-8 aspect-square rounded-full bg-grace-deep inline-flex items-center justify-center shrink-0 leading-none ring-2 ring-gold/60">
                    <span className="font-display text-sm text-gold leading-none">{initial}</span>
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">
                        <span className="block text-sm font-medium leading-tight truncate">{displayName}</span>
                        {user?.email && (
                          <span className="block text-[11px] text-white/55 truncate">{user.email}</span>
                        )}
                      </span>
                      <Icon icon={ChevronUp} size="sm" className="text-white/55" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 bg-[oklch(0.22_0.05_152)] border-white/10 text-white"
              >
                <DropdownMenuLabel className="text-white/60 text-xs font-normal">
                  Signed in as<br />
                  <span className="text-white/90">{user?.email || displayName}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white cursor-pointer">
                  <Link to="/settings">
                    <Icon icon={Settings} size="sm" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={signOut}
                  className="focus:bg-white/10 focus:text-white cursor-pointer"
                >
                  <Icon icon={LogOut} size="sm" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export const SIDEBAR_NAV = NAV;
export { Sun, NotebookPen, HandHeart, Headphones, Compass, Settings, LogOut };
