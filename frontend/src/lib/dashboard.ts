import type { Account, Transaction } from "@/ipc/types";

/** ISO "YYYY-MM-DD" bounds (inclusive) for the current calendar month, local time. */
export function currentMonthRange(now = new Date()): { from: string; to: string; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const monthLabels = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  return {
    from: toIso(first),
    to: toIso(last),
    label: `${monthLabels[m]} ${y}`,
  };
}

export interface MonthlyTotals {
  count: number;
  totalVes: number;
  avgDailyVes: number;
  daysElapsed: number;
}

/**
 * Aggregate totals for transactions whose `payment_date` falls in [from, to].
 * The daily average uses `daysElapsed` in the current month (up to today), not
 * the full month length, so numbers stay honest early in the month.
 */
export function computeMonthlyTotals(
  transactions: Transaction[],
  from: string,
  to: string,
  now = new Date()
): MonthlyTotals {
  const inRange = transactions.filter(
    (tx) => tx.payment_date >= from && tx.payment_date <= to
  );
  const totalVes = inRange.reduce((sum, tx) => sum + tx.ves_amount, 0);
  const daysElapsed = Math.max(1, Math.min(now.getDate(), monthLength(from)));
  return {
    count: inRange.length,
    totalVes,
    avgDailyVes: totalVes / daysElapsed,
    daysElapsed,
  };
}

export interface AccountAggregate {
  account: Account;
  totalVes: number;
  transactionCount: number;
}

/**
 * Top N accounts by total VES amount within [from, to]. Ties broken by
 * transaction count descending.
 */
export function computeTopAccounts(
  transactions: Transaction[],
  accounts: Account[],
  from: string,
  to: string,
  limit = 5
): AccountAggregate[] {
  const accountIndex = new Map(accounts.map((a) => [a.id, a]));
  const aggregates = new Map<string, AccountAggregate>();

  for (const tx of transactions) {
    if (tx.payment_date < from || tx.payment_date > to) continue;
    const account = accountIndex.get(tx.account_id);
    if (!account) continue;
    const current = aggregates.get(account.id);
    if (current) {
      current.totalVes += tx.ves_amount;
      current.transactionCount += 1;
    } else {
      aggregates.set(account.id, {
        account,
        totalVes: tx.ves_amount,
        transactionCount: 1,
      });
    }
  }

  return Array.from(aggregates.values())
    .sort(
      (a, b) =>
        b.totalVes - a.totalVes || b.transactionCount - a.transactionCount
    )
    .slice(0, limit);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLength(fromIso: string): number {
  const [y, m] = fromIso.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
