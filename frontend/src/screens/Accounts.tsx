import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Landmark,
  Loader2,
  RotateCw,
  Bell,
} from "lucide-react";
import { clsx } from "clsx";
import { deleteAccount, listAccounts } from "@/ipc/accounts";
import type { Account } from "@/ipc/types";
import { AccountModal } from "@/components/accounts/AccountModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { getAccountTypeMeta } from "@/lib/accountTypes";

export function AccountsScreen() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, isError, error } = useQuery({
    queryKey: ["accounts"],
    queryFn: listAccounts,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirming, setConfirming] = useState<Account | null>(null);

  const deletion = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Cuenta eliminada");
      setConfirming(null);
    },
    onError: (err: unknown) => {
      toast.error("No se pudo eliminar la cuenta", {
        description: String(err),
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando cuentas…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-expense/30 bg-expense/5 p-6 text-expense text-sm">
        No se pudieron cargar las cuentas: {String(error)}
      </div>
    );
  }

  const hasAccounts = (accounts?.length ?? 0) > 0;
  const periodicCount = accounts?.filter((a) => a.is_periodic).length ?? 0;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div className="text-[13px] text-text-secondary">
          {hasAccounts ? (
            <>
              {accounts!.length}{" "}
              {accounts!.length === 1 ? "cuenta registrada" : "cuentas registradas"}
              {periodicCount > 0 && (
                <>
                  {" · "}
                  <span className="text-accent-blue font-semibold">
                    {periodicCount}
                  </span>{" "}
                  periódica{periodicCount === 1 ? "" : "s"}
                </>
              )}
            </>
          ) : (
            "Sin cuentas registradas todavía"
          )}
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-[12.5px] px-4 py-2.5 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all"
        >
          <Plus size={15} strokeWidth={2.75} />
          Nueva cuenta
        </button>
      </div>

      {!hasAccounts ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {accounts!.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => openEdit(account)}
              onDelete={() => setConfirming(account)}
            />
          ))}
        </div>
      )}

      <AccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />

      <ConfirmModal
        open={confirming !== null}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && deletion.mutate(confirming.id)}
        title="Eliminar cuenta"
        body={
          confirming
            ? `¿Seguro que deseas eliminar "${confirming.name}"? Se quitará junto con su configuración de recordatorios. Si ya tiene transacciones registradas, la operación será rechazada.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deletion.isPending}
        destructive
      />
    </>
  );
}

interface AccountCardProps {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}

function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const meta = getAccountTypeMeta(account.account_type);
  const { Icon } = meta;

  return (
    <article className="bg-bg-card border border-border-strong rounded-[14px] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "w-11 h-11 flex-shrink-0 rounded-[12px] flex items-center justify-center",
            meta.avatarClass
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold truncate">{account.name}</div>
          <div
            className={clsx(
              "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1",
              meta.badgeClass
            )}
          >
            {account.account_type}
          </div>
        </div>
        <div className="flex gap-1.5">
          <IconButton onClick={onEdit} label="Editar cuenta" tone="neutral">
            <Pencil size={13} />
          </IconButton>
          <IconButton onClick={onDelete} label="Eliminar cuenta" tone="danger">
            <Trash2 size={13} />
          </IconButton>
        </div>
      </div>

      <p className="text-[11.5px] text-text-muted leading-relaxed line-clamp-2 min-h-[32px]">
        {account.description || "Sin descripción"}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-muted">
        {account.is_periodic && account.periodicity_days ? (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full">
            <RotateCw size={10} />
            Cada {account.periodicity_days} días
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-text-muted bg-bg-row px-2 py-1 rounded-full">
            Puntual
          </span>
        )}

        {account.notify && (
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand bg-brand/10 px-2 py-1 rounded-full">
            <Bell size={10} />
            Notifica
          </span>
        )}
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <Landmark size={26} className="text-brand" strokeWidth={2} />
      </div>
      <div className="text-base font-bold mb-1">Aún no tienes cuentas</div>
      <p className="text-sm text-text-muted max-w-sm mb-5 leading-relaxed">
        Registra tus compromisos de gasto —recurrentes como servicios y
        suscripciones, o puntuales como el mercado— para organizarlos por
        categoría.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-sm px-4 py-2.5 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all"
      >
        <Plus size={15} strokeWidth={2.75} />
        Crear primera cuenta
      </button>
    </div>
  );
}

interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  tone: "neutral" | "danger";
}

function IconButton({ children, onClick, label, tone }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "w-[30px] h-[30px] rounded-lg border flex items-center justify-center transition-colors",
        tone === "danger"
          ? "border-[#3a2530] text-expense hover:bg-expense/10"
          : "border-border-strong text-text-secondary hover:bg-bg-row hover:text-text-main"
      )}
    >
      {children}
    </button>
  );
}
