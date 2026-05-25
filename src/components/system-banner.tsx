import { X, Info, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { useActiveAnnouncement } from "@/hooks/use-announcements";
import { Icon } from "@/components/icon";

const SEVERITY_STYLES: Record<string, { bg: string; icon: typeof Info }> = {
  info: { bg: "bg-grace/95 text-white", icon: Info },
  success: { bg: "bg-emerald-700/95 text-white", icon: CheckCircle2 },
  warning: { bg: "bg-amber-600/95 text-white", icon: AlertTriangle },
  critical: { bg: "bg-red-700/95 text-white", icon: AlertOctagon },
};

export function SystemBanner() {
  const { announcement, dismiss } = useActiveAnnouncement();
  if (!announcement) return null;

  const style = SEVERITY_STYLES[announcement.severity] ?? SEVERITY_STYLES.info;

  return (
    <div className={`${style.bg} w-full shadow-sm`}>
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-start gap-3">
        <Icon icon={style.icon} size="sm" className="mt-0.5 shrink-0 opacity-90" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-semibold">{announcement.title}</span>
          {announcement.body && (
            <span className="opacity-90"> — {announcement.body}</span>
          )}
          {announcement.link_url && (
            <a
              href={announcement.link_url}
              className="ml-2 underline font-medium hover:opacity-80"
              target={announcement.link_url.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
            >
              {announcement.link_label ?? "Learn more"}
            </a>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="shrink-0 -mr-1 p-1 rounded-md hover:bg-white/15 transition-colors"
        >
          <Icon icon={X} size="sm" />
        </button>
      </div>
    </div>
  );
}
