import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { createWallet, updateWallet, type WalletInput } from "@/ipc/wallets";
import type { Wallet } from "@/ipc/types";

interface WalletModalProps {
  open: boolean;
  onClose: () => void;
  editing: Wallet | null;
}

const DEFAULT_FORM: WalletInput = {
  name: "",
  description: "",
  is_digital: true,
};

export function WalletModal({ open, onClose, editing }: WalletModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WalletInput>(DEFAULT_FORM);
  const [touched, setTouched] = useState(false);

  const isEditing = editing !== null;

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description,
        is_digital: editing.is_digital,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedName = form.name.trim();
      if (!trimmedName) {
        throw new Error("El nombre de la billetera es obligatorio");
      }
      const payload: WalletInput = {
        name: trimmedName,
        description: form.description.trim(),
        is_digital: form.is_digital,
      };
      if (isEditing && editing) {
        return updateWallet({ id: editing.id, ...payload });
      }
      return createWallet(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      toast.success(isEditing ? "Billetera actualizada" : "Billetera creada");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(
        isEditing
          ? "No se pudo actualizar la billetera"
          : "No se pudo crear la billetera",
        { description: String(error) }
      );
    },
  });

  const nameError = touched && !form.name.trim();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!form.name.trim()) return;
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar billetera" : "Nueva billetera"}
      subtitle={
        isEditing
          ? "Ajusta los datos de esta billetera."
          : "Registra un nuevo método de pago para tus gastos."
      }
      widthClass="w-[480px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre" error={nameError ? "El nombre es obligatorio" : undefined}>
          <input
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
            onBlur={() => setTouched(true)}
            placeholder="Banesco, Zinli, Efectivo Bs…"
            className="input"
            autoFocus
            maxLength={80}
          />
        </Field>

        <Field label="Descripción" hint="Opcional. Aparece en la tarjeta de la billetera.">
          <input
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="Cuenta corriente en bolívares"
            className="input"
            maxLength={140}
          />
        </Field>

        <Toggle
          checked={form.is_digital}
          onChange={(next) => setForm({ ...form, is_digital: next })}
          label="Billetera digital"
          hint="Permite registrar una referencia de pago en las transacciones."
        />

        <div className="flex gap-3 mt-3">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm px-5 py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-brand text-[#05130d] font-bold text-sm px-6 py-2.5 rounded-[11px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50"
          >
            {mutation.isPending
              ? "Guardando…"
              : isEditing
                ? "Actualizar"
                : "Crear billetera"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
        {label}
      </span>
      {children}
      {error ? (
        <span className="block text-[10.5px] text-expense mt-1.5">{error}</span>
      ) : hint ? (
        <span className="block text-[10.5px] text-text-muted mt-1.5 leading-relaxed">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
