import { GroupedList, ZenListRow } from "@/components/ui/zen/list-row";
import type { ZenIconName } from "@/components/ui/zen/zen-icon";

export const SETTINGS_ROUTES = [
  { label: "Schedule", icon: "calendar", href: "/schedule" },
  { label: "Reminders", icon: "bell", href: "/reminders" },
  { label: "Completion sound", icon: "sound", href: "/completion-sound?source=settings" },
  { label: "Appearance", icon: "palette", href: "/appearance" },
  { label: "Reduced motion", icon: "motion", href: "/appearance" },
  { label: "Privacy & Data", icon: "lock", href: "/privacy" },
  { label: "About", icon: "info", href: "/about" },
] as const satisfies readonly { label: string; icon: ZenIconName; href: string }[];

export function SettingsMenu({ onNavigate }: { onNavigate: (href: (typeof SETTINGS_ROUTES)[number]["href"]) => void }) {
  return (
    <GroupedList>
      {SETTINGS_ROUTES.map((item) => (
        <ZenListRow
          key={item.label}
          accessibilityHint={`Opens ${item.label.toLowerCase()} settings`}
          className="min-h-[68px]"
          icon={item.icon}
          label={item.label}
          onPress={() => onNavigate(item.href)}
        />
      ))}
    </GroupedList>
  );
}
