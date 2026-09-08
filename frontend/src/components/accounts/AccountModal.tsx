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

const DEFAULT_START_DAY = 1;
const DEFAULT_DUE_DAY = 15;

interface FormState {
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  start_day_input: string;
  due_day_input: string;
  notify: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  account_type: "Servicios Básicos",
  is_periodic: false,
  start_day_input: String(DEFAULT_START_DAY),
  due_day_input: String(DEFAULT_DUE_DAY),
  notify: false,
};

export function AccountModal({ open, onClose, editing }: AccountModalProps) {
  const queryClient = useQueryClient();
  const isEditing = editing !== null;

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
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
        start_day_input: String(editing.start_day ?? DEFAULT_START_DAY),
        due_day_input: String(editing.due_day ?? DEFAULT_DUE_DAY),
        notify: editing.notify,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [open, editing]);

  const togglePeriodic = (next: boolean) => {
    setForm((current) => ({
      ...current,
      is_periodic: next,
      notify: next ? current.notify : false,
    }));
  };

  const handleDayInput = (
    field: "start_day_input" | "due_day_input",
    raw: string
  ) => {
    const cleaned = raw.replace(/\D/g, "").slice(0, 2);
    setForm((current) => ({ ...current, [field]: cleaned }));
  };

  const parseDay = (raw: string): number | null => {
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "El nombre es obligatorio";
    if (form.is_periodic) {
      const start = parseDay(form.start_day_input);
      const due = parseDay(form.due_day_input);
      if (start === null || start < 1 || start > 31) {
        return "El día de inicio debe estar entre 1 y 31";
      }
      if (due === null || due < 1 || due > 31) {
        return "El día de vencimiento debe estar entre 1 y 31";
      }
      if (start > due) {
        return "El día de inicio no puede ser mayor al de vencimiento";
      }
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const start = parseDay(form.start_day_input);
      const due = parseDay(form.due_day_input);
      const payload: AccountInput = {
        name: form.name.trim(),
        description: form.description.trim(),
        account_type: form.account_type,
        is_periodic: form.is_periodic,
        start_day: form.is_periodic ? start : null,
        due_day: form.is_periodic ? due : null,
        notify: form.is_periodic ? form.notify : false,
      };
      if (isEditing && editing) {
        return updateAccount({ id: editing.id, ...payload, archived_at: editing.archived_at });
      }
      return createAccount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
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
      widthClass="w-[540px]"
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
            hint="Se paga cada mes dentro de una ventana de fechas fija."
          />

          {form.is_periodic && (
            <div className="pl-[50px] flex flex-col gap-3">
              <div className="flex gap-4">
                <label className="block flex-1">
                  <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
                    Día de inicio
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.start_day_input}
                    onChange={(event) =>
                      handleDayInput("start_day_input", event.target.value)
                    }
                    className="input font-mono w-full"
                    placeholder="1"
                  />
                </label>
                <label className="block flex-1">
                  <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
                    Día de vencimiento
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.due_day_input}
                    onChange={(event) =>
                      handleDayInput("due_day_input", event.target.value)
                    }
                    className="input font-mono w-full"
                    placeholder="15"
                  />
                </label>
              </div>
              <p className="text-[10.5px] text-text-muted leading-relaxed">
                Los días son del calendario mensual (1 a 31). Si el día
                excede la duración del mes (ej: 31 en febrero), se ajusta
                automáticamente al último día. La ventana no puede cruzar
                de un mes al siguiente.
              </p>
            </div>
          )}

          <Toggle
            checked={form.notify}
            onChange={(next) => setForm({ ...form, notify: next })}
            label="Incluir en recordatorios por correo"
            hint={
              form.is_periodic
                ? "Recibirás avisos automáticos en cada momento del ciclo."
                : "Sólo disponible para cuentas periódicas."
            }
            disabled={!form.is_periodic}
          />
        </div>

        {error && touched && !nameError && (
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
