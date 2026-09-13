import { Modal } from "@/components/ui/Modal";
import { Upload, AlertTriangle } from "lucide-react";

interface ImportConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  filename: string;
  importing?: boolean;
}

export function ImportConfirmModal({
  open,
  onClose,
  onConfirm,
  filename,
  importing = false,
}: ImportConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={importing ? () => {} : onClose}
      title="Importar respaldo"
      subtitle="Se reemplazará el estado actual con el contenido del archivo."
      widthClass="w-[500px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 bg-bcv/[0.06] border border-bcv/25 rounded-[10px] px-4 py-3">
          <div className="w-9 h-9 rounded-[10px] bg-bcv/12 text-bcv flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 text-[12.5px] text-text-secondary leading-relaxed">
            <div className="font-bold text-bcv mb-1">Esta acción es reversible</div>
            <p>
              Antes de importar, Waled creará automáticamente un respaldo del
              estado actual en <code className="text-text-secondary bg-bg-main/60 px-1 rounded">import_backups/</code>. Si algo sale mal
              podrás restaurar desde ahí.
            </p>
          </div>
        </div>

        <div>
          <div className="text-[11.5px] font-bold text-text-secondary mb-1.5">
            Archivo a importar
          </div>
          <div className="text-[12px] font-mono text-text-main bg-bg-main/60 border border-border-muted rounded-[8px] px-3 py-2 break-all">
            {filename}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="flex-1 bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={importing}
            className="flex-1 flex items-center justify-center gap-1.5 bg-brand text-[#05130d] font-bold text-sm py-2.5 rounded-[11px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Upload size={13} />
            {importing ? "Importando…" : "Importar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
