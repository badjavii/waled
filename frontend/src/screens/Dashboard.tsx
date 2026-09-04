import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { listTransactions } from "@/ipc/transactions";
import { listAccounts } from "@/ipc/accounts";
import { listReminders } from "@/ipc/reminders";
import { getCurrentBcvRate } from "@/ipc/bcv";
import {
  computeMonthlyTotals,
  computeTopAccounts,
  currentMonthRange,
} from "@/lib/dashboard";
import { MonthlyTotalCard } from "@/components/dashboard/MonthlyTotalCard";
import { BcvRateCard } from "@/components/dashboard/BcvRateCard";
import { TopAccountsCard } from "@/components/dashboard/TopAccountsCard";
import { UpcomingPaymentsCard } from "@/components/dashboard/UpcomingPaymentsCard";
import type { Screen } from "@/types/screens";

interface DashboardScreenProps {
  onNavigate: (screen: Screen) => void;
}

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const txQuery = useQuery({ queryKey: ["transactions"], queryFn: listTransactions });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });
  const remindersQuery = useQuery({ queryKey: ["reminders"], queryFn: listReminders });
  const bcvQuery = useQuery({ queryKey: ["bcv-rate"], queryFn: getCurrentBcvRate });

  const isLoading =
    txQuery.isLoading || accountsQuery.isLoading || remindersQuery.isLoading;

  const monthRange = useMemo(() => currentMonthRange(), []);
  const totals = useMemo(
    () =>
      computeMonthlyTotals(txQuery.data ?? [], monthRange.from, monthRange.to),
    [txQuery.data, monthRange]
  );
  const topAccounts = useMemo(
    () =>
      computeTopAccounts(
        txQuery.data ?? [],
        accountsQuery.data ?? [],
        monthRange.from,
        monthRange.to
      ),
    [txQuery.data, accountsQuery.data, monthRange]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando dashboard…
      </div>
    );
  }

  const currentRate = bcvQuery.data?.rate ?? null;

  return (
    <div className="h-full flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-5">
        <MonthlyTotalCard
          monthLabel={monthRange.label}
          totals={totals}
          currentBcvRate={currentRate}
        />
        <BcvRateCard rate={bcvQuery.data} loading={bcvQuery.isLoading} />
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-2 gap-5">
        <TopAccountsCard
          aggregates={topAccounts}
          currentBcvRate={currentRate}
        />
        <UpcomingPaymentsCard
          reminders={remindersQuery.data ?? []}
          onSeeAll={() => onNavigate("reminders")}
        />
      </div>
    </div>
  );
}
