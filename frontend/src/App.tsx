import { Shell } from "@/components/shell/Shell";
import { WalletsScreen } from "@/screens/Wallets";
import { AccountsScreen } from "@/screens/Accounts";
import { TransactionsScreen } from "@/screens/Transactions";
import { DashboardScreen } from "@/screens/Dashboard";
import { RemindersScreen } from "@/screens/Reminders";
import type { Screen } from "@/types/screens";

export default function App() {
  return (
    <Shell>
      {(screen, setScreen) => (
        <ScreenRouter screen={screen} onNavigate={setScreen} />
      )}
    </Shell>
  );
}

interface ScreenRouterProps {
  screen: Screen;
  onNavigate: (next: Screen) => void;
}

function ScreenRouter({ screen, onNavigate }: ScreenRouterProps) {
  switch (screen) {
    case "dashboard":
      return <DashboardScreen onNavigate={onNavigate} />;
    case "transactions":
      return <TransactionsScreen onNavigate={onNavigate} />;
    case "accounts":
      return <AccountsScreen />;
    case "wallets":
      return <WalletsScreen />;
    case "reminders":
      return <RemindersScreen />;
  }
}
