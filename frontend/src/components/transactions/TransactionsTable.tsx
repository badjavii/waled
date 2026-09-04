import { Info, Pencil, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { Account, Transaction, Wallet } from "@/ipc/types";
import { formatBs, formatIsoDateShort, formatUsd } from "@/lib/format";
import { getAccountTypeMeta } from "@/lib/accountTypes";

interface TransactionsTableProps {
  rows: Transaction[];
  accountIndex: Map<string, Account>;
  walletIndex: Map<string, Wallet>;
  currentBcvRate: number | null;
  onDetails: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export function TransactionsTable({
  rows,
  accountIndex,
  walletIndex,
  currentBcvRate,
  onDetails,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[14px] border border-border-strong bg-bg-card py-16 text-center">
        <div className="text-[13px] text-text-secondary font-semibold mb-1">
          No hay transacciones que coincidan con los filtros
        </div>
        <div className="text-[11.5px] text-text-muted">
          Ajusta los filtros o registra una nueva transacción.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-strong rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-[2fr_1.1fr_1fr_1fr_0.9fr_0.9fr_112px] gap-3 px-4 py-3 border-b border-border-base bg-bg-row text-[10.5px] font-bold text-text-muted uppercase tracking-wider">
        <span>Cuenta / descripción</span>
        <span>Billetera</span>
        <span>Fecha de pago</span>
        <span className="text-right">Monto</span>
        <span className="text-right">USD al pagar</span>
        <span className="text-right">USD hoy</span>
        <span />
      </div>

      {rows.map((tx) => {
        const account = accountIndex.get(tx.account_id);
        const wallet = walletIndex.get(tx.wallet_id);
        const usdThen = tx.bcv_rate_at_payment > 0
          ? tx.ves_amount / tx.bcv_rate_at_payment
          : 0;
        const usdNow = currentBcvRate && currentBcvRate > 0
          ? tx.ves_amount / currentBcvRate
          : null;
        const meta = account ? getAccountTypeMeta(account.account_type) : null;
        const AvatarIcon = meta?.Icon;

        return (
          <div
            key={tx.id}
            className="grid grid-cols-[2fr_1.1fr_1fr_1fr_0.9fr_0.9fr_112px] gap-3 px-4 py-3 border-b border-border-muted items-center last:border-b-0 hover:bg-bg-row/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={clsx(
                  "w-9 h-9 flex-shrink-0 rounded-[10px] flex items-center justify-center",
                  meta?.avatarClass ?? "bg-bg-row text-text-muted"
                )}
              >
                {AvatarIcon ? <AvatarIcon size={16} /> : <span>?</span>}
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold truncate">
                  {account?.name ?? <span className="text-text-muted">Cuenta eliminada</span>}
                </div>
                <div className="text-[11px] text-text-muted truncate">
                  {tx.description || "Sin descripción"}
                </div>
              </div>
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[12px] text-text-main">
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full",
                    wallet?.is_digital ? "bg-accent-blue" : "bg-bcv"
                  )}
                />
                <span className="truncate">
                  {wallet?.name ?? <span className="text-text-muted">Billetera eliminada</span>}
                </span>
              </div>
              {tx.payment_reference && (
                <div className="font-mono text-[10.5px] text-text-muted mt-0.5 truncate">
                  ref {tx.payment_reference}
                </div>
              )}
            </div>

            <div className="font-mono text-[12.5px] text-text-secondary">
              {formatIsoDateShort(tx.payment_date)}
            </div>

            <div className="text-right font-mono text-[14px] font-semibold text-expense">
              Bs {formatBs(tx.ves_amount)}
            </div>

            <div className="text-right font-mono text-[12.5px] text-text-secondary">
              ${formatUsd(usdThen)}
            </div>

            <div className="text-right font-mono text-[12.5px] text-text-main">
              {usdNow !== null ? `$${formatUsd(usdNow)}` : "—"}
            </div>

            <div className="flex gap-1.5 justify-end">
              <IconAction onClick={() => onDetails(tx)} label="Ver detalle" tone="info">
                <Info size={13} />
              </IconAction>
              <IconAction onClick={() => onEdit(tx)} label="Editar" tone="neutral">
                <Pencil size={13} />
              </IconAction>
              <IconAction onClick={() => onDelete(tx)} label="Eliminar" tone="danger">
                <Trash2 size={13} />
              </IconAction>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface IconActionProps {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone: "info" | "neutral" | "danger";
}

function IconAction({ children, onClick, label, tone }: IconActionProps) {
  const toneClass =
    tone === "info"
      ? "border-border-strong text-accent-blue hover:bg-accent-blue/10"
      : tone === "danger"
        ? "border-[#3a2530] text-expense hover:bg-expense/10"
        : "border-border-strong text-text-secondary hover:bg-bg-row hover:text-text-main";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "w-[30px] h-[30px] rounded-lg border flex items-center justify-center transition-colors",
        toneClass
      )}
    >
      {children}
    </button>
  );
}
