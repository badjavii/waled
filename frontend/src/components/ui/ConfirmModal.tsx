import { Trash2, AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: string;
  confirmLabel: string;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  body,
  confirmLabel,
  loading,
  destructive,
}: ConfirmModalProps) {
  const Icon = destructive ? Trash2 : AlertTriangle;
  return (
    <Modal open={open} onClose={onCancel} title={title} widthClass="w-[420px]">
      <div className="flex flex-col items-center text-center">
        <div
          className={
            destructive
              ? "w-[52px] h-[52px] rounded-[14px] bg-expense/10 flex items-center justify-center text-expense mb-4"
              : "w-[52px] h-[52px] rounded-[14px] bg-bcv/10 flex items-center justify-center text-bcv mb-4"
          }
        >
          <Icon size={22} />
        </div>
        <p className="text-[12.5px] text-text-secondary leading-relaxed mb-5 max-w-[320px]">
          {body}
        </p>
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "flex-1 bg-expense text-white font-bold text-sm py-2.5 rounded-[11px] hover:brightness-110 transition-all disabled:opacity-50"
                : "flex-1 bg-brand text-[#05130d] font-bold text-sm py-2.5 rounded-[11px] hover:brightness-110 transition-all disabled:opacity-50"
            }
          >
            {loading ? "Procesando…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
