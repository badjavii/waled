import { Modal } from "@/components/ui/Modal";
import { WifiOff, RefreshCw } from "lucide-react";

interface NetworkRequiredModalProps {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  /** Optional message from the backend explaining what failed. */
  detail?: string;
  /** Optional context sentence describing the operation, shown above
   *  the standard explanation. e.g. "para crear esta cuenta periódica". */
  operationLabel?: string;
  retrying?: boolean;
}

/**
 * Shown when a mutation that requires online sync with Google Apps
 * Script failed (network down, GAS unreachable, non-2xx response).
 *
 * The user has two options: retry (which re-executes the same mutation)
 * or cancel (which closes the modal and leaves local state unchanged).
 */
export function NetworkRequiredModal({
  open,
  onClose,
  onRetry,
  detail,
  operationLabel,
  retrying = false,
}: NetworkRequiredModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Se necesita conexión a internet"
      subtitle="Esta operación se sincroniza automáticamente con tu Google Apps Script."
      widthClass="w-[480px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-expense/[0.04] border border-expense/25 rounded-[10px] px-4 py-3">
          <div className="w-9 h-9 rounded-[10px] bg-expense/12 text-expense flex items-center justify-center flex-shrink-0">
            <WifiOff size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-expense">
              No se pudo sincronizar con Google Apps Script
            </div>
            <p className="text-[11.5px] text-text-secondary mt-1 leading-relaxed">
              {operationLabel
                ? `Se necesita conexión ${operationLabel}. `
                : "Se necesita conexión para completar esta acción. "}
              Los datos no se guardaron para mantener el estado local y remoto
              alineados.
            </p>
          </div>
        </div>

        {detail && (
          <div className="text-[11px] text-text-muted font-mono bg-bg-row/50 border border-border-muted rounded-[8px] px-3 py-2 leading-relaxed break-words max-h-32 overflow-y-auto">
            {detail}
          </div>
        )}

        <p className="text-[11.5px] text-text-muted leading-relaxed">
          Verifica tu conexión a internet y que la URL del webhook de
          sincronización esté correctamente configurada. También puedes
          dejarla vacía en Configuración si prefieres operar sin
          sincronización con GAS.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={retrying}
            className="flex-1 bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-[#05130d] font-bold text-sm py-2.5 rounded-[11px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={retrying ? "animate-spin" : ""}
            />
            {retrying ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
