import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Loader2 } from "lucide-react";

interface WipeConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** The exact user_name the user must type to unlock the wipe. */
  expectedName: string;
  wiping?: boolean;
}

/**
 * High-friction confirmation modal for the "Restablecer aplicación"
 * action. Unlike the generic ConfirmModal, this one requires the user
 * to type their exact user_name to enable the destructive button.
 *
 * This is intentional: wipe is irreversible and we want the user to
 * pause and demonstrate deliberate intent. The pattern mirrors GitHub's
 * repository deletion flow.
 */
export function WipeConfirmModal({
  open,
  onClose,
  onConfirm,
  expectedName,
  wiping = false,
}: WipeConfirmModalProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  const matches = typed.trim() === expectedName.trim() && expectedName.trim().length > 0;
  const canConfirm = matches && !wiping;

  return (
    <Modal
      open={open}
      onClose={wiping ? () => {} : onClose}
      title="Restablecer aplicación"
      subtitle="Esta acción es irreversible. Se creará un respaldo automático antes de borrar."
      widthClass="w-[520px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-expense/[0.04] border border-expense/25 rounded-[10px] px-4 py-3">
          <div className="w-9 h-9 rounded-[10px] bg-expense/12 text-expense flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 text-[12.5px] text-text-secondary leading-relaxed">
            <div className="font-bold text-expense mb-1">
              Se borrarán todos tus datos
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Todas las billeteras y cuentas.</li>
              <li>Todas las transacciones registradas.</li>
              <li>Tu perfil (nombre y correo).</li>
              <li>Las URLs de los webhooks de Google Apps Script.</li>
            </ul>
            <p className="mt-2">
              Se conservará solamente la carpeta de respaldos configurada,
              donde encontrarás el respaldo pre-limpieza.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
            Para confirmar, escribe tu nombre exacto:{" "}
            <span className="text-text-main font-mono">{expectedName}</span>
          </label>
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={expectedName}
            disabled={wiping}
            className="input font-mono"
            autoFocus
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={wiping}
            className="flex-1 bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 bg-expense text-white font-bold text-sm py-2.5 rounded-[11px] shadow-lg shadow-expense/25 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {wiping ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Restableciendo…
              </>
            ) : (
              "Restablecer"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
