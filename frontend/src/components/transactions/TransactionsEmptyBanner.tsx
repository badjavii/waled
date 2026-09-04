import { AlertCircle } from "lucide-react";

interface TransactionsEmptyBannerProps {
  hasAccounts: boolean;
  hasWallets: boolean;
  onGoAccounts: () => void;
  onGoWallets: () => void;
}

export function TransactionsEmptyBanner({
  hasAccounts,
  hasWallets,
  onGoAccounts,
  onGoWallets,
}: TransactionsEmptyBannerProps) {
  const missing: string[] = [];
  if (!hasAccounts) missing.push("Cuenta");
  if (!hasWallets) missing.push("Billetera");
  const missingLabel = missing.join(" y una ");

  return (
    <div className="flex items-center gap-3.5 bg-bcv/[0.07] border border-bcv/25 rounded-[14px] px-5 py-4 mb-4">
      <div className="w-[38px] h-[38px] flex-shrink-0 rounded-[10px] bg-bcv/15 flex items-center justify-center text-bcv">
        <AlertCircle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-bcv">
          Aún no puedes registrar transacciones
        </div>
        <div className="text-[12px] text-[#a99a6a] mt-0.5">
          Primero debes crear al menos una{" "}
          <b className="text-text-main">{missingLabel}</b>.
        </div>
      </div>
      {!hasAccounts && (
        <button
          type="button"
          onClick={onGoAccounts}
          className="bg-[#151c25] border border-[#3a3420] text-bcv font-semibold text-[12.5px] px-4 py-2.5 rounded-[10px] hover:bg-bg-row transition-colors"
        >
          Crear cuenta
        </button>
      )}
      {!hasWallets && (
        <button
          type="button"
          onClick={onGoWallets}
          className="bg-[#151c25] border border-[#3a3420] text-bcv font-semibold text-[12.5px] px-4 py-2.5 rounded-[10px] hover:bg-bg-row transition-colors"
        >
          Crear billetera
        </button>
      )}
    </div>
  );
}
