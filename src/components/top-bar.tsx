import { Link } from "@tanstack/react-router";
import { Flame, Search } from "lucide-react";
import { Icon } from "@/components/icon";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { firstNameCap } from "@/lib/personalization";

export function TopBar() {
  const { profile, user } = useAuth();
  const displayName = firstNameCap(profile?.name, user?.email?.[0]?.toUpperCase() || "F");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 px-3 md:px-6 pt-3 bg-transparent">
      <div className="h-12 flex items-center gap-3">
        <SidebarTrigger className="text-white/85 hover:bg-white/10 hidden md:inline-flex" />
        <div className="relative flex-1 max-w-md">
          <Icon icon={Search} size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/75" />
          <input
            placeholder="Search devotionals, notes, prayers"
            className="w-full bg-transparent hover:bg-white/5 focus:bg-white/8 placeholder:text-white/60 text-white/90 text-sm rounded-full pl-9 pr-3 py-1.5 outline-none border border-white/15 focus:border-white/30 transition"
          />
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-white/85 px-2.5 py-1 rounded-full border border-white/15">
          <Icon icon={Flame} size="sm" className="text-gold" /> 1 day
        </span>
        <Link
          to="/settings"
          className="w-8 h-8 rounded-full bg-gold/90 text-gold-foreground flex items-center justify-center text-sm font-semibold shadow-soft"
        >
          {initial}
        </Link>
      </div>
    </header>
  );
}
