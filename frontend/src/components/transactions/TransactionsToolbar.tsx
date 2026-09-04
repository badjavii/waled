import { Search, Plus } from "lucide-react";
import { clsx } from "clsx";
import { Select } from "@/components/ui/Select";
import type { AccountType } from "@/ipc/types";
import { ACCOUNT_TYPES } from "@/lib/accountTypes";
import type { DateRangeKey, Filters, SortKey } from "@/hooks/useTransactionFilters";

interface TransactionsToolbarProps {
  filters: Filters;
  onChange: (updater: (current: Filters) => Filters) => void;
  onCreate: () => void;
  createDisabled: boolean;
  createDisabledReason?: string;
}

export function TransactionsToolbar({
  filters,
  onChange,
  onCreate,
  createDisabled,
  createDisabledReason,
}: TransactionsToolbarProps) {
  return (
    <div className="flex items-center gap-2.5 mb-4 flex-wrap">
      <div className="flex items-center gap-2 bg-bg-row border border-border-base rounded-[10px] px-3 w-[300px]">
        <Search size={14} className="text-text-muted" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) =>
            onChange((c) => ({ ...c, search: event.target.value }))
          }
          placeholder="Buscar por descripción o cuenta…"
          className="flex-1 bg-transparent border-none py-2.5 text-[13px] text-text-main placeholder:text-[#4a5563] outline-none"
        />
      </div>

      <div className="w-[190px]">
        <Select<AccountType | "all">
          value={filters.category}
          onChange={(next) => onChange((c) => ({ ...c, category: next }))}
          options={[
            { value: "all", label: "Todas las categorías" },
            ...ACCOUNT_TYPES.map((t) => ({ value: t.label, label: t.label })),
          ]}
          ariaLabel="Filtrar por categoría"
        />
      </div>

      <div className="w-[180px]">
        <Select<DateRangeKey>
          value={filters.range}
          onChange={(next) => onChange((c) => ({ ...c, range: next }))}
          options={[
            { value: "last30", label: "Últimos 30 días" },
            { value: "thisMonth", label: "Este mes" },
            { value: "lastMonth", label: "Mes pasado" },
            { value: "all", label: "Todo el historial" },
          ]}
          ariaLabel="Filtrar por rango de fechas"
        />
      </div>

      <div className="w-[210px]">
        <Select<SortKey>
          value={filters.sort}
          onChange={(next) => onChange((c) => ({ ...c, sort: next }))}
          options={[
            { value: "date_desc", label: "Fecha: más reciente" },
            { value: "date_asc", label: "Fecha: más antigua" },
            { value: "amount_desc", label: "Monto: mayor a menor" },
            { value: "amount_asc", label: "Monto: menor a mayor" },
          ]}
          ariaLabel="Ordenar transacciones"
        />
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onCreate}
        disabled={createDisabled}
        title={createDisabled ? createDisabledReason : "Nueva transacción"}
        className={clsx(
          "flex items-center gap-1.5 font-bold text-[12.5px] px-4 py-2.5 rounded-[10px] transition-all",
          createDisabled
            ? "bg-bg-row text-text-muted border border-border-base cursor-not-allowed"
            : "bg-brand text-[#05130d] shadow-lg shadow-brand/25 hover:brightness-110"
        )}
      >
        <Plus size={15} strokeWidth={2.75} />
        Nueva transacción
      </button>
    </div>
  );
}
