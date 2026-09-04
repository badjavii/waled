import { clsx } from "clsx";
import type { AccountAggregate } from "@/lib/dashboard";
import { getAccountTypeMeta } from "@/lib/accountTypes";
import { formatBs, formatUsd } from "@/lib/format";

interface TopAccountsCardProps {
  aggregates: AccountAggregate[];
  currentBcvRate: number | null;
}

export function TopAccountsCard({ aggregates, currentBcvRate }: TopAccountsCardProps) {
  return (
    <section className="bg-bg-card border border-border-strong rounded-2xl p-5 flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[15px] font-bold">Top 5 cuentas más costosas</h3>
        <span className="text-[12px] text-text-muted font-medium">Este mes</span>
      </div>

      {aggregates.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-[13px] py-8 text-center">
          Aún no hay gastos registrados este mes.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1">
          {aggregates.map((entry, index) => (
            <TopRow
              key={entry.account.id}
              rank={index + 1}
              entry={entry}
              currentBcvRate={currentBcvRate}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface TopRowProps {
  rank: number;
  entry: AccountAggregate;
  currentBcvRate: number | null;
}

function TopRow({ rank, entry, currentBcvRate }: TopRowProps) {
  const meta = getAccountTypeMeta(entry.account.account_type);
  const { Icon } = meta;
  const usd =
    currentBcvRate && currentBcvRate > 0 ? entry.totalVes / currentBcvRate : null;

  return (
    <div className="flex items-center gap-3.5 px-3.5 py-2.5 bg-bg-row border border-border-base rounded-xl">
      <span className="font-mono text-[13px] font-bold text-text-muted w-4">
        {rank}
      </span>
      <div
        className={clsx(
          "w-10 h-10 flex-shrink-0 rounded-[11px] flex items-center justify-center",
          meta.avatarClass
        )}
      >
        <Icon size={17} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold truncate">{entry.account.name}</div>
        <span className="inline-block text-[10.5px] font-bold text-text-secondary bg-bg-card px-2 py-0.5 rounded-full mt-1">
          {entry.transactionCount} {entry.transactionCount === 1 ? "transac." : "transac."}
        </span>
      </div>
      <div className="text-right">
        <div className="font-mono text-[14px] font-semibold text-expense">
          Bs {formatBs(entry.totalVes, 0)}
        </div>
        <div className="font-mono text-[11.5px] text-text-muted mt-0.5">
          {usd !== null ? `≈ $${formatUsd(usd)}` : "—"}
        </div>
      </div>
    </div>
  );
}
