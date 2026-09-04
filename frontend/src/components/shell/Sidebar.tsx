import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Wallet,
  Bell,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";
import type { Screen } from "@/types/screens";
import type { Settings } from "@/ipc/types";
import { getInitials } from "@/lib/format";

interface SidebarProps {
  activeScreen: Screen;
  onScreenChange: (screen: Screen) => void;
  onOpenSettings: () => void;
  settings: Settings | null | undefined;
}

interface NavItem {
  id: Screen;
  label: string;
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { id: "transactions", label: "Transacciones", Icon: ArrowLeftRight },
  { id: "accounts", label: "Cuentas", Icon: Landmark },
  { id: "wallets", label: "Billeteras", Icon: Wallet },
  { id: "reminders", label: "Recordatorios", Icon: Bell },
];

export function Sidebar({
  activeScreen,
  onScreenChange,
  onOpenSettings,
  settings,
}: SidebarProps) {
  const rawName = settings?.user_name?.trim() ?? "";
  const rawEmail = settings?.user_email?.trim() ?? "";
  const displayName = rawName || "Sin configurar";
  const displayEmail = rawEmail || "Añade tu correo";
  const initials = rawName ? getInitials(rawName) : "?";

  return (
    <aside className="w-[264px] flex-shrink-0 bg-bg-sidebar border-r border-border-muted flex flex-col px-4 py-5">
      <div className="px-2 pb-5">
        <h1 className="text-lg font-extrabold tracking-tight">Waled</h1>
      </div>

      <div className="text-[10.5px] font-bold text-text-muted uppercase tracking-widest px-2 pb-2">
        Navegación
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeScreen === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onScreenChange(id)}
              className={clsx(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-[10px] text-sm font-semibold text-left transition-colors",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-text-secondary hover:bg-bg-row hover:text-text-main"
              )}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-2.5 px-2.5 py-2.5 border-t border-border-muted hover:bg-bg-row rounded-[10px] transition-colors text-left"
      >
        <div className="w-8 h-8 flex-shrink-0 rounded-[9px] bg-[#1c2530] flex items-center justify-center font-bold text-xs text-text-secondary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-semibold truncate">
            {displayName}
          </div>
          <div className="text-[10.5px] text-text-muted truncate">
            {displayEmail}
          </div>
        </div>
        <SettingsIcon size={14} className="text-text-muted" />
      </button>
    </aside>
  );
}
