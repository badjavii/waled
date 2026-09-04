import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

interface TransactionsPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  from: number;
  to: number;
  onChange: (page: number) => void;
}

export function TransactionsPagination({
  page,
  totalPages,
  totalItems,
  from,
  to,
  onChange,
}: TransactionsPaginationProps) {
  if (totalPages <= 1) {
    return (
      <div className="mt-4 text-[12px] text-text-muted">
        Mostrando {totalItems} de {totalItems} transacciones
      </div>
    );
  }

  const pages = pageWindow(page, totalPages);

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-[12px] text-text-muted">
        Mostrando <b className="text-text-main">{from}–{to}</b> de {totalItems} transacciones
      </span>
      <div className="flex items-center gap-1.5">
        <PageButton
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          ariaLabel="Página anterior"
        >
          <ChevronLeft size={14} />
        </PageButton>
        {pages.map((entry, index) =>
          entry === "…" ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-text-muted text-[13px]">
              …
            </span>
          ) : (
            <PageButton
              key={entry}
              active={entry === page}
              onClick={() => onChange(entry)}
              ariaLabel={`Ir a la página ${entry}`}
            >
              {entry}
            </PageButton>
          )
        )}
        <PageButton
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          ariaLabel="Página siguiente"
        >
          <ChevronRight size={14} />
        </PageButton>
      </div>
    </div>
  );
}

function pageWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) pages.push("…");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

interface PageButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}

function PageButton({ children, onClick, active, disabled, ariaLabel }: PageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        "w-[34px] h-[34px] rounded-[9px] flex items-center justify-center font-mono text-[13px] font-semibold transition-colors",
        active
          ? "bg-brand text-[#05130d]"
          : "bg-bg-row border border-border-strong text-text-secondary hover:bg-bg-card hover:text-text-main",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );
}
