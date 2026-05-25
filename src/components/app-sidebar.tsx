import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
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
import doveLogo from "@/assets/round-transparent-green-dove.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/heart-notes", label: "Heart Notes", icon: NotebookPen },
  { to: "/prayers", label: "Prayers", icon: HandHeart },
  { to: "/listen", label: "Listen", icon: Headphones },
  { to: "/journey", label: "Journey", icon: Compass },
] as const;

const PIN_KEY = "gn:sidebar:pinned";

function firstName(full: string | undefined | null, fallback = "Friend") {
  if (!full) return fallback;
  return full.trim().split(/\s+/)[0] || fallback;
}

export function AppSidebar() {
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { state, setOpen, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, user } = useAuth();
  const streak = useStreak();

  const displayName = firstName(profile?.name) || user?.email?.split("@")[0] || "Friend";
  const initial = displayName.charAt(0).toUpperCase();

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

  // Compact streak display: 1-2 digits inline; 3+ digits shrinks gracefully
  const streakText = streak > 999 ? "999+" : String(streak);

  return (
    <Sidebar collapsible="icon" className="border-r-0 group/sidebar">
      <SidebarHeader className="px-2 py-4 group-data-[collapsible=icon]:px-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Home"
              className="h-12 hover:bg-white/10 text-white transition-colors duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:mx-auto"
            >
              <Link
                to="/home"
                aria-label="GraceNotes Daily home"
                className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0"
              >
                <span className="w-9 h-9 aspect-square rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white ring-1 ring-gold/40 shadow-[0_0_18px_-6px_var(--gold)]">
                  <img src={doveLogo} alt="" className="w-8 h-8 object-contain" />
                </span>
                {!collapsed && (
                  <span className="font-display text-lg text-white tracking-tight truncate">
                    GraceNotes Daily
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="mt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {NAV.map((item) => {
                const active = currentPath === item.to || currentPath.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={[
                        "relative h-11 rounded-lg text-white/75 transition-all duration-200 ease-out",
                        "hover:bg-white/10 hover:text-white",
                        "data-[active=true]:bg-white/[0.12] data-[active=true]:text-white",
                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:mx-auto",
                        "[&>svg]:!size-6",
                      ].join(" ")}
                    >
                      <Link to={item.to} className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                        {active && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-gold shadow-[0_0_10px_var(--gold)]"
                          />
                        )}
                        <Icon
                          icon={item.icon}
                          size="nav"
                          tone="inherit"
                          className={[
                            "shrink-0 transition-all duration-200",
                            active
                              ? "text-gold opacity-100 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--gold)_55%,transparent)]"
                              : "opacity-85 group-hover/menu-item:opacity-100 group-hover/menu-item:drop-shadow-[0_0_5px_rgba(255,255,255,0.35)]",
                          ].join(" ")}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 gap-2">
        <SidebarMenu className="gap-2">
          {/* Streak — visible expanded AND collapsed */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={`${streak} day streak`}
              className="h-11 rounded-lg text-white/85 hover:bg-transparent cursor-default group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:mx-auto"
            >
              {collapsed ? (
                <span className="inline-flex flex-col items-center justify-center leading-none gap-0.5">
                  <Icon icon={Flame} size="sm" className="text-gold" tone="inherit" />
                  <span className="font-semibold text-gold text-[10px] leading-none tabular-nums">
                    {streakText}
                  </span>
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center justify-center shrink-0 rounded-full bg-gold/15 ring-1 ring-gold/40 min-w-9 h-9 px-2 gap-1 shadow-[0_0_14px_-6px_var(--gold)]">
                    <Icon icon={Flame} size="sm" className="text-gold shrink-0" tone="inherit" />
                    <span className="font-semibold text-gold text-[12px] leading-none tabular-nums">
                      {streakText}
                    </span>
                  </span>
                  <span className="text-white/70 text-sm">day streak</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Collapse toggle — only visible on sidebar hover */}
          <SidebarMenuItem
            className="opacity-0 group-hover/sidebar:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
          >
            <SidebarMenuButton
              onClick={togglePin}
              tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="h-10 rounded-lg text-white/75 hover:bg-white/10 hover:text-white transition-colors duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:mx-auto"
            >
              <Icon
                icon={collapsed ? PanelLeftOpen : PanelLeftClose}
                size="nav"
                className="shrink-0"
              />
              {!collapsed && <span>Collapse</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User profile with nested Settings + Sign out */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  tooltip={displayName}
                  className="h-12 rounded-lg text-white hover:bg-white/10 data-[state=open]:bg-white/10 transition-colors duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:mx-auto"
                >
                  <span className="w-9 h-9 aspect-square rounded-full bg-grace-deep inline-flex items-center justify-center shrink-0 leading-none ring-2 ring-gold/60 shadow-[0_0_10px_-4px_var(--gold)]">
                    <span className="font-display text-sm text-gold leading-none">{initial}</span>
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left truncate">
                        <span className="block text-sm font-medium leading-tight truncate">
                          {displayName}
                        </span>
                        {user?.email && (
                          <span className="block text-[11px] text-white/65 truncate">
                            {user.email}
                          </span>
                        )}
                      </span>
                      <Icon icon={ChevronUp} size="sm" className="text-white/65" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56 bg-[oklch(0.22_0.05_152)] border-white/10 text-white"
              >
                <DropdownMenuLabel className="text-white/70 text-xs font-normal">
                  Signed in as<br />
                  <span className="text-white">{user?.email || displayName}</span>
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
export { NotebookPen, HandHeart, Headphones, Compass, Settings, LogOut };
