import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { createAccount, updateAccount, type AccountInput } from "@/ipc/accounts";
import type { Account, AccountType } from "@/ipc/types";
import { ACCOUNT_TYPES } from "@/lib/accountTypes";

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  editing: Account | null;
}

const DEFAULT_PERIODICITY = 30;

const DEFAULT_FORM: AccountInput = {
  name: "",
  description: "",
  account_type: "Servicios Básicos",
  is_periodic: false,
  periodicity_days: null,
  notify: false,
};

export function AccountModal({ open, onClose, editing }: AccountModalProps) {
  const queryClient = useQueryClient();
  const isEditing = editing !== null;

  const [form, setForm] = useState<AccountInput>(DEFAULT_FORM);
  const [periodicityInput, setPeriodicityInput] = useState<string>(
    String(DEFAULT_PERIODICITY)
  );
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description,
        account_type: editing.account_type,
        is_periodic: editing.is_periodic,
        periodicity_days: editing.periodicity_days,
        notify: editing.notify,
      });
      setPeriodicityInput(String(editing.periodicity_days ?? DEFAULT_PERIODICITY));
    } else {
      setForm(DEFAULT_FORM);
      setPeriodicityInput(String(DEFAULT_PERIODICITY));
    }
  }, [open, editing]);

  const togglePeriodic = (next: boolean) => {
    setForm((current) => ({
      ...current,
      is_periodic: next,
      periodicity_days: next
        ? Number.parseInt(periodicityInput, 10) || DEFAULT_PERIODICITY
        : null,
      // If periodicity is turned off, forcibly disable notify too — it
      // has no meaning without a cycle.
      notify: next ? current.notify : false,
    }));
  };

  const handlePeriodicityChange = (raw: string) => {
    // Keep only digits, allow empty string while typing.
    const cleaned = raw.replace(/\D/g, "");
    setPeriodicityInput(cleaned);
    setForm((current) => ({
      ...current,
      periodicity_days: cleaned ? Number.parseInt(cleaned, 10) : null,
    }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "El nombre es obligatorio";
    if (form.is_periodic) {
      const days = form.periodicity_days;
      if (!days || days <= 0) {
        return "La periodicidad debe ser un número positivo";
      }
      if (days > 3650) {
        return "La periodicidad es demasiado grande (máximo 3650 días)";
      }
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: AccountInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        account_type: form.account_type,
        is_periodic: form.is_periodic,
        periodicity_days: form.is_periodic ? form.periodicity_days : null,
        notify: form.is_periodic ? form.notify : false,
      };
      if (isEditing && editing) {
        return updateAccount({ id: editing.id, ...payload });
      }
      return createAccount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(isEditing ? "Cuenta actualizada" : "Cuenta creada");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(
        isEditing
          ? "No se pudo actualizar la cuenta"
          : "No se pudo crear la cuenta",
        { description: String(error) }
      );
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (validate()) return;
    mutation.mutate();
  };

  const error = touched ? validate() : null;
  const nameError = touched && !form.name.trim();
  const periodicityError =
    touched &&
    form.is_periodic &&
    (!form.periodicity_days || form.periodicity_days <= 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar cuenta" : "Nueva cuenta"}
      subtitle={
        isEditing
          ? "Ajusta los datos de esta cuenta."
          : "Registra un nuevo compromiso de gasto (recurrente o puntual)."
      }
      widthClass="w-[520px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Nombre"
          error={nameError ? "El nombre es obligatorio" : undefined}
        >
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            onBlur={() => setTouched(true)}
            placeholder="Electricidad, Netflix, Alquiler…"
            className="input"
            autoFocus
            maxLength={80}
          />
        </Field>

        <Field
          label="Descripción"
          hint="Opcional. Ayuda a recordar de qué se trata la cuenta."
        >
          <input
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="Recibo de luz del apartamento en Chacao."
            className="input"
            maxLength={200}
          />
        </Field>

        <Field label="Categoría">
          <Select<AccountType>
            value={form.account_type}
            onChange={(next) => setForm({ ...form, account_type: next })}
            options={ACCOUNT_TYPES.map((type) => ({
              value: type.label,
              label: type.label,
            }))}
            ariaLabel="Categoría de la cuenta"
          />
        </Field>

        <div className="flex flex-col gap-3 pt-3 border-t border-border-muted">
          <Toggle
            checked={form.is_periodic}
            onChange={togglePeriodic}
            label="Cuenta periódica"
            hint="Se repite cada cierto número de días (mensualidad, servicio, suscripción)."
          />

          {form.is_periodic && (
            <div className="pl-[50px]">
              <label className="block">
                <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
                  Periodicidad (días)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={periodicityInput}
                  onChange={(event) => handlePeriodicityChange(event.target.value)}
                  className="input w-[140px] font-mono"
                  placeholder="30"
                />
                {periodicityError ? (
                  <span className="block text-[10.5px] text-expense mt-1.5">
                    Debe ser un número positivo
                  </span>
                ) : (
                  <span className="block text-[10.5px] text-text-muted mt-1.5">
                    Ej: 30 (mensual), 15 (quincenal), 365 (anual).
                  </span>
                )}
              </label>
            </div>
          )}

          <Toggle
            checked={form.notify}
            onChange={(next) => setForm({ ...form, notify: next })}
            label="Incluir en recordatorios por correo"
            hint={
              form.is_periodic
                ? "Recibirás un aviso por correo cerca del vencimiento."
                : "Sólo disponible para cuentas periódicas."
            }
            disabled={!form.is_periodic}
          />
        </div>

        {error && touched && !nameError && !periodicityError && (
          <div className="text-[11.5px] text-expense">{error}</div>
        )}

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
                : "Crear cuenta"}
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
