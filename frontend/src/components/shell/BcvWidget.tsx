import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { BcvRate } from "@/ipc/types";
import { formatBs, formatShortDate } from "@/lib/format";
import { refreshBcvRate } from "@/ipc/bcv";
import { clsx } from "clsx";

interface BcvWidgetProps {
  rate: BcvRate | null | undefined;
  loading: boolean;
}

export function BcvWidget({ rate, loading }: BcvWidgetProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: refreshBcvRate,
    onSuccess: (fresh) => {
      queryClient.setQueryData(["bcv-rate"], fresh);
      toast.success("Tasa actualizada", {
        description: `Bs ${formatBs(fresh.rate)} · ${formatShortDate(fresh.date)}`,
      });
    },
    onError: (err) => {
      toast.error("Sin conexión con DolarApi", { description: String(err) });
    },
  });

  const offline = !loading && !rate;

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 bg-[#12171e] border rounded-[10px] px-3 py-1.5 transition-colors",
        offline ? "border-[#3a2530]" : "border-[#2a2418]"
      )}
    >
      <div
        className={clsx(
          "w-[26px] h-[26px] rounded-[7px] flex items-center justify-center font-extrabold text-xs",
          offline ? "bg-expense/10 text-expense" : "bg-bcv/10 text-bcv"
        )}
      >
        $
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={clsx(
            "text-[9.5px] font-bold tracking-widest uppercase",
            offline ? "text-expense/70" : "text-[#8a7a4a]"
          )}
        >
          {offline ? "Sin conexión" : "BCV hoy"}
        </span>
        {loading ? (
          <span className="text-sm text-text-muted font-mono">cargando…</span>
        ) : rate ? (
          <span className="font-mono text-base font-bold text-bcv">
            Bs {formatBs(rate.rate)}
          </span>
        ) : (
          <span className="font-mono text-base font-bold text-text-muted">
            ----
          </span>
        )}
      </div>
      {rate && (
        <>
          <div className="w-px h-5 bg-[#2a3038] mx-0.5" />
          <div className="font-mono text-[10px] text-text-muted font-semibold">
            {formatShortDate(rate.date)} / USD
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        title="Actualizar tasa"
        className="ml-1 w-6 h-6 rounded-md text-text-muted hover:text-bcv hover:bg-bcv/10 flex items-center justify-center transition-colors disabled:opacity-50"
      >
        <RefreshCw
          size={12}
          className={mutation.isPending ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}
