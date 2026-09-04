import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Wallet as WalletIcon,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { deleteWallet, listWallets } from "@/ipc/wallets";
import type { Wallet } from "@/ipc/types";
import { WalletModal } from "@/components/wallets/WalletModal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export function WalletsScreen() {
  const queryClient = useQueryClient();

  const { data: wallets, isLoading, isError, error } = useQuery({
    queryKey: ["wallets"],
    queryFn: listWallets,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Wallet | null>(null);
  const [confirming, setConfirming] = useState<Wallet | null>(null);

  const deletion = useMutation({
    mutationFn: (id: string) => deleteWallet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Billetera eliminada");
      setConfirming(null);
    },
    onError: (err: unknown) => {
      toast.error("No se pudo eliminar la billetera", {
        description: String(err),
      });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (wallet: Wallet) => {
    setEditing(wallet);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando billeteras…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-expense/30 bg-expense/5 p-6 text-expense text-sm">
        No se pudieron cargar las billeteras: {String(error)}
      </div>
    );
  }

  const hasWallets = (wallets?.length ?? 0) > 0;

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[13px] text-text-secondary">
            {hasWallets
              ? `${wallets!.length} ${wallets!.length === 1 ? "billetera registrada" : "billeteras registradas"}`
              : "Sin billeteras registradas todavía"}
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-[12.5px] px-4 py-2.5 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all"
        >
          <Plus size={15} strokeWidth={2.75} />
          Nueva billetera
        </button>
      </div>

      {!hasWallets ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {wallets!.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onEdit={() => openEdit(wallet)}
              onDelete={() => setConfirming(wallet)}
            />
          ))}
        </div>
      )}

      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />

      <ConfirmModal
        open={confirming !== null}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && deletion.mutate(confirming.id)}
        title="Eliminar billetera"
        body={
          confirming
            ? `¿Seguro que deseas eliminar "${confirming.name}"? No podrás usarla en nuevas transacciones. Si ya tiene transacciones registradas, la operación será rechazada.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deletion.isPending}
        destructive
      />
    </>
  );
}

interface WalletCardProps {
  wallet: Wallet;
  onEdit: () => void;
  onDelete: () => void;
}

function WalletCard({ wallet, onEdit, onDelete }: WalletCardProps) {
  const initial = wallet.name.trim().charAt(0).toUpperCase() || "?";
  const digital = wallet.is_digital;

  return (
    <article className="bg-bg-card border border-border-strong rounded-[14px] p-4 flex items-center gap-3.5 hover:border-border-strong/70 transition-colors">
      <div
        className={clsx(
          "w-11 h-11 flex-shrink-0 rounded-[12px] flex items-center justify-center font-extrabold text-base",
          digital
            ? "bg-accent-blue/15 text-accent-blue"
            : "bg-bcv/10 text-bcv"
        )}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold truncate">{wallet.name}</span>
          <span
            className={clsx(
              "text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap",
              digital
                ? "text-brand bg-brand/10"
                : "text-text-secondary bg-bg-row"
            )}
          >
            {digital ? "Digital" : "Físico"}
          </span>
        </div>
        <div className="text-[11.5px] text-text-muted mt-0.5 truncate">
          {wallet.description || "Sin descripción"}
        </div>
      </div>

      <div className="flex gap-1.5">
        <IconButton onClick={onEdit} label="Editar billetera" tone="neutral">
          <Pencil size={13} />
        </IconButton>
        <IconButton onClick={onDelete} label="Eliminar billetera" tone="danger">
          <Trash2 size={13} />
        </IconButton>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <WalletIcon size={26} className="text-brand" strokeWidth={2} />
      </div>
      <div className="text-base font-bold mb-1">Aún no tienes billeteras</div>
      <p className="text-sm text-text-muted max-w-sm mb-5 leading-relaxed">
        Crea tu primer método de pago (banco, efectivo o billetera digital) para
        empezar a registrar gastos.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-sm px-4 py-2.5 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all"
      >
        <Plus size={15} strokeWidth={2.75} />
        Crear primera billetera
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
