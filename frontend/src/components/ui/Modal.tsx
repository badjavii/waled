import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = "w-[460px]",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(3,5,8,0.72)] backdrop-blur-sm cursor-default"
      />
      <div
        className={clsx(
          "relative bg-bg-card border border-[#2a3441] rounded-2xl p-6 shadow-2xl",
          widthClass
        )}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold leading-tight">{title}</h2>
            {subtitle && (
              <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-[30px] h-[30px] rounded-lg border border-border-strong flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-bg-row transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
