import type { MonthlyTotals } from "@/lib/dashboard";
import { formatBs, formatUsd } from "@/lib/format";

interface MonthlyTotalCardProps {
  monthLabel: string;
  totals: MonthlyTotals;
  currentBcvRate: number | null;
}

export function MonthlyTotalCard({
  monthLabel,
  totals,
  currentBcvRate,
}: MonthlyTotalCardProps) {
  const usdEquivalent =
    currentBcvRate && currentBcvRate > 0 ? totals.totalVes / currentBcvRate : null;

  return (
    <section className="bg-bg-card border border-border-strong rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-secondary font-semibold">
          Total de gastos · {monthLabel}
        </span>
        <span className="text-[12px] font-bold font-mono text-expense">
          {totals.count} {totals.count === 1 ? "transac." : "transac."}
        </span>
      </div>

      <div className="flex items-end justify-between gap-5 mt-4">
        <div>
          <div className="font-mono text-[46px] font-bold tracking-tight text-expense leading-none">
            Bs {formatBs(totals.totalVes, 0)}
          </div>
          <div className="font-mono text-[17px] text-text-secondary font-medium mt-2.5">
            {usdEquivalent !== null
              ? `≈ $${formatUsd(usdEquivalent)} USD`
              : "USD no disponible (sin conexión)"}
          </div>
        </div>
        <div className="text-right pb-1">
          <div className="text-[11.5px] text-text-muted">Promedio diario</div>
          <div className="font-mono text-[16px] font-semibold text-text-main mt-0.5">
            Bs {formatBs(totals.avgDailyVes, 0)}
          </div>
        </div>
      </div>
    </section>
  );
}
