import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { getSettings } from "@/ipc/settings";
import { getCurrentBcvRate } from "@/ipc/bcv";
import type { Screen } from "@/types/screens";

const SCREEN_META: Record<Screen, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Resumen del mes en curso",
  },
  transactions: {
    title: "Transacciones",
    subtitle: "Historial de gastos registrados",
  },
  accounts: {
    title: "Cuentas",
    subtitle: "Gastos recurrentes y puntuales",
  },
  wallets: {
    title: "Billeteras",
    subtitle: "Métodos de pago registrados",
  },
  reminders: {
    title: "Recordatorios",
    subtitle: "Próximos vencimientos",
  },
};

interface ShellProps {
  children: (screen: Screen, setScreen: (next: Screen) => void) => ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  const { data: rate, isLoading: rateLoading } = useQuery({
    queryKey: ["bcv-rate"],
    queryFn: getCurrentBcvRate,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });

  const meta = SCREEN_META[screen];

  return (
    <div className="h-screen flex flex-col bg-bg-main text-text-main overflow-hidden">
      <div className="flex-1 min-h-0 flex">
        <Sidebar
          activeScreen={screen}
          onScreenChange={setScreen}
          onOpenSettings={() => setSettingsOpen(true)}
          settings={settings}
        />
        <main className="flex-1 min-w-0 flex flex-col">
          <TopBar
            title={meta.title}
            subtitle={meta.subtitle}
            rate={rate}
            loading={rateLoading}
          />
          <div className="flex-1 min-h-0 overflow-y-auto px-8 py-7">
            {children(screen, setScreen)}
          </div>
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
