import { Modal } from "@/components/ui/Modal";
import { clsx } from "clsx";
import type { Account, BcvRate, Transaction, Wallet } from "@/ipc/types";
import {
  formatBs,
  formatIsoDateShort,
  formatIsoDateTime,
  formatUsd,
} from "@/lib/format";
import { getAccountTypeMeta } from "@/lib/accountTypes";

interface TransactionDetailsModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  account: Account | null;
  wallet: Wallet | null;
  currentBcvRate: BcvRate | null;
}

export function TransactionDetailsModal({
  open,
  onClose,
  transaction,
  account,
  wallet,
  currentBcvRate,
}: TransactionDetailsModalProps) {
  if (!transaction) {
    return <Modal open={open} onClose={onClose} title="Detalle" children={null} />;
  }

  const meta = account ? getAccountTypeMeta(account.account_type) : null;
  const Icon = meta?.Icon;

  const usdThen = transaction.bcv_rate_at_payment > 0
    ? transaction.ves_amount / transaction.bcv_rate_at_payment
    : 0;
  const usdNow = currentBcvRate && currentBcvRate.rate > 0
    ? transaction.ves_amount / currentBcvRate.rate
    : null;

  return (
    <Modal open={open} onClose={onClose} title="Detalle de transacción" widthClass="w-[560px]">
      <div className="flex items-center gap-3 mb-4">
        <div
          className={clsx(
            "w-12 h-12 rounded-[12px] flex items-center justify-center flex-shrink-0",
            meta?.avatarClass ?? "bg-bg-row text-text-muted"
          )}
        >
          {Icon ? <Icon size={22} /> : <span>?</span>}
        </div>
        <div className="min-w-0">
          <div className="text-[17px] font-extrabold truncate">
            {account?.name ?? "Cuenta eliminada"}
          </div>
          <div className="text-[12px] text-text-muted mt-0.5">
            {account?.account_type ?? "—"} ·{" "}
            {wallet ? (
              <>
                {wallet.name}
                {wallet.archived_at && (
                  <span className="text-text-muted ml-1">(Archivada)</span>
                )}
              </>
            ) : (
              "Billetera no encontrada"
            )}
          </div>
        </div>
      </div>

      <div className="bg-bg-row border border-border-base rounded-[12px] px-4">
        <Row label="Descripción" value={transaction.description || "—"} />
        <Row
          label="Fecha de pago"
          value={formatIsoDateShort(transaction.payment_date)}
          mono
        />
        <Row
          label="Fecha de registro"
          value={formatIsoDateTime(transaction.created_at)}
          mono
        />
        {transaction.payment_reference && (
          <Row label="Referencia" value={transaction.payment_reference} mono />
        )}
        <Row
          label="Tasa BCV congelada"
          value={`Bs ${formatBs(transaction.bcv_rate_at_payment)}`}
          mono
          accent="bcv"
        />
        <Row
          label="Monto"
          value={`Bs ${formatBs(transaction.ves_amount)}`}
          mono
          accent="expense"
          bold
        />
        <Row
          label="Equivalente al pagar"
          value={`$ ${formatUsd(usdThen)}`}
          mono
        />
        <Row
          label={
            currentBcvRate
              ? `Equivalente hoy (Bs ${formatBs(currentBcvRate.rate)})`
              : "Equivalente hoy"
          }
          value={usdNow !== null ? `$ ${formatUsd(usdNow)}` : "Sin tasa disponible"}
          mono
          accent="brand"
          last
        />
      </div>

      <div className="flex justify-end mt-5">
        <button
          type="button"
          onClick={onClose}
          className="bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm px-6 py-2.5 rounded-[11px] hover:bg-bg-row transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

interface RowProps {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  accent?: "bcv" | "brand" | "expense";
  last?: boolean;
}

function Row({ label, value, mono, bold, accent, last }: RowProps) {
  const accentClass =
    accent === "bcv"
      ? "text-bcv"
      : accent === "brand"
        ? "text-brand"
        : accent === "expense"
          ? "text-expense"
          : "text-text-main";
  return (
    <div
      className={clsx(
        "flex items-center justify-between py-3",
        !last && "border-b border-border-muted"
      )}
    >
      <span className="text-[12.5px] text-text-secondary">{label}</span>
      <span
        className={clsx(
          "text-right",
          mono && "font-mono",
          bold ? "text-[15px] font-bold" : "text-[13px] font-semibold",
          accentClass
        )}
      >
        {value}
      </span>
    </div>
  );
}
