import type { BcvRate } from "@/ipc/types";
import { formatBs, formatShortDate, formatIsoDateTime } from "@/lib/format";

interface BcvRateCardProps {
  rate: BcvRate | null | undefined;
  loading: boolean;
}

export function BcvRateCard({ rate, loading }: BcvRateCardProps) {
  return (
    <section className="bg-bg-card border border-[#2a2418] rounded-2xl p-6 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-secondary font-semibold">
          Tasa BCV del día
        </span>
        <span className="w-[30px] h-[30px] rounded-lg bg-bcv/10 flex items-center justify-center font-extrabold text-[13px] text-bcv">
          $
        </span>
      </div>

      <div>
        {loading ? (
          <div className="text-text-muted font-mono text-lg mt-4">cargando…</div>
        ) : rate ? (
          <>
            <div className="font-mono text-[42px] font-bold tracking-tight text-bcv leading-none mt-4">
              Bs {formatBs(rate.rate)}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="font-mono text-[13px] text-text-muted">por 1 USD</span>
              <span className="text-[11px] text-text-muted font-mono">
                · publicada {formatShortDate(rate.date)}
              </span>
            </div>
            <div className="text-[10.5px] text-text-muted font-mono mt-1">
              Actualizada {formatIsoDateTime(rate.fetched_at)}
            </div>
          </>
        ) : (
          <>
            <div className="font-mono text-[42px] font-bold tracking-tight text-text-muted leading-none mt-4">
              ----
            </div>
            <div className="text-[12px] text-expense/80 font-semibold mt-3">
              Sin conexión con DolarApi
            </div>
            <div className="text-[10.5px] text-text-muted mt-1">
              El widget del TopBar se refresca automáticamente al recuperar red.
            </div>
          </>
        )}
      </div>
    </section>
  );
}
