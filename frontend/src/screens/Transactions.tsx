import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Receipt } from "lucide-react";
import { listTransactions, deleteTransaction } from "@/ipc/transactions";
import { listAccounts } from "@/ipc/accounts";
import { listWallets, listAllWallets } from "@/ipc/wallets";
import { getCurrentBcvRate } from "@/ipc/bcv";
import type { Transaction } from "@/ipc/types";
import { useTransactionFilters } from "@/hooks/useTransactionFilters";
import { TransactionsToolbar } from "@/components/transactions/TransactionsToolbar";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionsPagination } from "@/components/transactions/TransactionsPagination";
import { TransactionsEmptyBanner } from "@/components/transactions/TransactionsEmptyBanner";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import { TransactionDetailsModal } from "@/components/transactions/TransactionDetailsModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import type { Screen } from "@/types/screens";

interface TransactionsScreenProps {
  onNavigate: (screen: Screen) => void;
}

export function TransactionsScreen({ onNavigate }: TransactionsScreenProps) {
  const queryClient = useQueryClient();

  const txQuery = useQuery({ queryKey: ["transactions"], queryFn: listTransactions });
  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: listAccounts });

  // Active wallets: powers the wallet selector in the create/edit modal.
  const activeWalletsQuery = useQuery({
    queryKey: ["wallets"],
    queryFn: listWallets,
  });

  // All wallets (active + archived): powers the read-only hydration of
  // historical transactions in the table and details modal. This ensures
  // that a transaction paid with an archived wallet still displays its
  // original name instead of falling back to "wallet not found".
  const allWalletsQuery = useQuery({
    queryKey: ["wallets", "all"],
    queryFn: listAllWallets,
  });

  const bcvQuery = useQuery({ queryKey: ["bcv-rate"], queryFn: getCurrentBcvRate });

  const {
    filters,
    setFilters,
    page,
    setPage,
    totalItems,
    totalPages,
    from,
    to,
    rows,
    accountIndex,
    walletIndex,
  } = useTransactionFilters(
    txQuery.data,
    accountsQuery.data,
    allWalletsQuery.data, // <-- hydrate index from ALL wallets, not just active
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [detailing, setDetailing] = useState<Transaction | null>(null);
  const [confirming, setConfirming] = useState<Transaction | null>(null);

  const deletion = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Transacción eliminada");
      setConfirming(null);
    },
    onError: (err: unknown) => {
      toast.error("No se pudo eliminar la transacción", { description: String(err) });
    },
  });

  const anyLoading =
    txQuery.isLoading ||
    accountsQuery.isLoading ||
    activeWalletsQuery.isLoading ||
    allWalletsQuery.isLoading;

  const anyError =
    txQuery.error ||
    accountsQuery.error ||
    activeWalletsQuery.error ||
    allWalletsQuery.error;

  if (anyLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando transacciones…
      </div>
    );
  }

  if (anyError) {
    return (
      <div className="rounded-xl border border-expense/30 bg-expense/5 p-6 text-expense text-sm">
        No se pudieron cargar los datos: {String(anyError)}
      </div>
    );
  }

  const hasAccounts = (accountsQuery.data?.length ?? 0) > 0;
  const hasWallets = (activeWalletsQuery.data?.length ?? 0) > 0;
  const canCreate = hasAccounts && hasWallets;
  const hasAnyTransaction = (txQuery.data?.length ?? 0) > 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFormOpen(true);
  };

  return (
    <>
      {!canCreate && (
        <TransactionsEmptyBanner
          hasAccounts={hasAccounts}
          hasWallets={hasWallets}
          onGoAccounts={() => onNavigate("accounts")}
          onGoWallets={() => onNavigate("wallets")}
        />
      )}

      <TransactionsToolbar
        filters={filters}
        onChange={setFilters}
        onCreate={openCreate}
        createDisabled={!canCreate}
        createDisabledReason={
          !canCreate
            ? "Primero registra al menos una Cuenta y una Billetera"
            : undefined
        }
      />

      {!hasAnyTransaction ? (
        <EmptyState canCreate={canCreate} onCreate={openCreate} />
      ) : (
        <>
          <TransactionsTable
            rows={rows}
            accountIndex={accountIndex}
            walletIndex={walletIndex}
            currentBcvRate={bcvQuery.data?.rate ?? null}
            onDetails={setDetailing}
            onEdit={openEdit}
            onDelete={setConfirming}
          />
          <TransactionsPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            from={from}
            to={to}
            onChange={setPage}
          />
        </>
      )}

      <TransactionModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        accounts={accountsQuery.data ?? []}
        wallets={activeWalletsQuery.data ?? []} // <-- modal uses ONLY active wallets
        currentBcvRate={bcvQuery.data ?? null}
      />

      <TransactionDetailsModal
        open={detailing !== null}
        onClose={() => setDetailing(null)}
        transaction={detailing}
        account={detailing ? accountIndex.get(detailing.account_id) ?? null : null}
        wallet={detailing ? walletIndex.get(detailing.wallet_id) ?? null : null}
        currentBcvRate={bcvQuery.data ?? null}
      />

      <ConfirmModal
        open={confirming !== null}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && deletion.mutate(confirming.id)}
        title="Eliminar transacción"
        body={
          confirming
            ? `¿Seguro que deseas eliminar esta transacción de Bs ${confirming.ves_amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deletion.isPending}
        destructive
      />
    </>
  );
}

interface EmptyStateProps {
  canCreate: boolean;
  onCreate: () => void;
}

function EmptyState({ canCreate, onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <Receipt size={26} className="text-brand" strokeWidth={2} />
      </div>
      <div className="text-base font-bold mb-1">Aún no hay transacciones</div>
      <p className="text-sm text-text-muted max-w-sm mb-5 leading-relaxed">
        Registra tu primer gasto para empezar a llevar el control mensual y ver
        los equivalentes en USD según la tasa BCV.
      </p>
      {canCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="bg-brand text-[#05130d] font-bold text-sm px-4 py-2.5 rounded-[10px] hover:brightness-110 transition-all"
        >
          Registrar primer gasto
        </button>
      )}
    </div>
  );
}
