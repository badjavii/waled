import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { createTransaction, updateTransaction, type TransactionInput } from "@/ipc/transactions";
import type { Account, BcvRate, Transaction, Wallet } from "@/ipc/types";
import { formatBs, formatUsd, toIsoDate } from "@/lib/format";

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  editing: Transaction | null;
  accounts: Account[];
  wallets: Wallet[];
  currentBcvRate: BcvRate | null;
}

interface FormState {
  account_id: string;
  wallet_id: string;
  ves_amount_input: string;
  payment_date: string;
  description: string;
  payment_reference: string;
  auto_rate: boolean;
  manual_rate_input: string;
}

export function TransactionModal({
  open,
  onClose,
  editing,
  accounts,
  wallets,
  currentBcvRate,
}: TransactionModalProps) {
  const queryClient = useQueryClient();
  const isEditing = editing !== null;

  const defaultState = useMemo<FormState>(() => ({
    account_id: accounts[0]?.id ?? "",
    wallet_id: wallets[0]?.id ?? "",
    ves_amount_input: "",
    payment_date: toIsoDate(new Date()),
    description: "",
    payment_reference: "",
    auto_rate: currentBcvRate !== null,
    manual_rate_input: currentBcvRate ? String(currentBcvRate.rate) : "",
  }), [accounts, wallets, currentBcvRate]);

  const [form, setForm] = useState<FormState>(defaultState);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (editing) {
      setForm({
        account_id: editing.account_id,
        wallet_id: editing.wallet_id,
        ves_amount_input: editing.ves_amount.toFixed(2).replace(".", ","),
        payment_date: editing.payment_date,
        description: editing.description,
        payment_reference: editing.payment_reference ?? "",
        auto_rate: false, // editing always shows the frozen rate as manual
        manual_rate_input: String(editing.bcv_rate_at_payment),
      });
    } else {
      setForm(defaultState);
    }
  }, [open, editing, defaultState]);

  const selectedWallet = wallets.find((w) => w.id === form.wallet_id);
  const isDigitalWallet = selectedWallet?.is_digital ?? false;

  const parsedAmount = parseSpanishNumber(form.ves_amount_input);
  const parsedManualRate = parseSpanishNumber(form.manual_rate_input);

  const effectiveRate = form.auto_rate
    ? currentBcvRate?.rate ?? 0
    : parsedManualRate;

  const usdPreview = effectiveRate > 0 && parsedAmount > 0
    ? parsedAmount / effectiveRate
    : null;

  const validate = (): string | null => {
    if (!form.account_id) return "Selecciona una cuenta";
    if (!form.wallet_id) return "Selecciona una billetera";
    if (!parsedAmount || parsedAmount <= 0) return "El monto debe ser positivo";
    if (!form.payment_date) return "La fecha de pago es obligatoria";
    if (!form.auto_rate && (!parsedManualRate || parsedManualRate <= 0)) {
      return "La tasa manual debe ser un número positivo";
    }
    if (form.auto_rate && !currentBcvRate) {
      return "No hay tasa BCV en memoria. Cambia a modo manual.";
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const rateToApply = form.auto_rate
        ? currentBcvRate?.rate ?? 0
        : parsedManualRate;
      const payload: TransactionInput = {
        account_id: form.account_id,
        wallet_id: form.wallet_id,
        ves_amount: parsedAmount,
        payment_date: form.payment_date,
        description: form.description.trim(),
        payment_reference: isDigitalWallet
          ? form.payment_reference.trim() || null
          : null,
        bcv_rate_at_payment: rateToApply,
      };
      if (isEditing && editing) {
        return updateTransaction(editing.id, payload);
      }
      return createTransaction(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(isEditing ? "Transacción actualizada" : "Transacción registrada");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(
        isEditing
          ? "No se pudo actualizar la transacción"
          : "No se pudo registrar la transacción",
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
  const canUseAuto = currentBcvRate !== null && !isEditing;

  // Wallet change: if new wallet is not digital, clear the reference.
  const handleWalletChange = (nextId: string) => {
    const next = wallets.find((w) => w.id === nextId);
    setForm((current) => ({
      ...current,
      wallet_id: nextId,
      payment_reference: next?.is_digital ? current.payment_reference : "",
    }));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar transacción" : "Nueva transacción"}
      subtitle={
        isEditing
          ? "La tasa BCV registrada no se modifica al editar."
          : "El monto se guarda en bolívares. La tasa BCV se congela al registrar."
      }
      widthClass="w-[600px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cuenta">
            <Select<string>
              value={form.account_id}
              onChange={(next) => setForm({ ...form, account_id: next })}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
              ariaLabel="Cuenta"
            />
          </Field>

          <Field label="Billetera">
            <Select<string>
              value={form.wallet_id}
              onChange={handleWalletChange}
              options={wallets.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.is_digital ? "digital" : "efectivo"})`,
              }))}
              ariaLabel="Billetera"
            />
          </Field>

          <Field label="Monto en bolívares">
            <div className="flex items-center bg-bg-main border border-[#2a3441] rounded-[10px] px-3 focus-within:border-brand transition-colors">
              <span className="font-mono text-[15px] text-text-muted font-semibold">Bs</span>
              <input
                inputMode="decimal"
                value={form.ves_amount_input}
                onChange={(event) =>
                  setForm({ ...form, ves_amount_input: event.target.value })
                }
                placeholder="0,00"
                className="flex-1 bg-transparent border-none py-2.5 px-2 text-base font-bold text-text-main font-mono outline-none"
                autoFocus
              />
            </div>
          </Field>

          <Field label="Fecha de pago">
            <input
              type="date"
              value={form.payment_date}
              onChange={(event) =>
                setForm({ ...form, payment_date: event.target.value })
              }
              className="input font-mono"
            />
          </Field>
        </div>

        <Field label="Descripción" hint="Opcional. Ayuda a identificar el gasto.">
          <input
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="Recibo del mes de agosto"
            className="input"
            maxLength={200}
          />
        </Field>

        {isDigitalWallet && (
          <Field
            label="Referencia de pago"
            hint="Nº de referencia o confirmación del pago digital. Opcional."
          >
            <input
              value={form.payment_reference}
              onChange={(event) =>
                setForm({ ...form, payment_reference: event.target.value })
              }
              placeholder="48210000"
              className="input font-mono"
              maxLength={64}
            />
          </Field>
        )}

        <div className="flex flex-col gap-3 pt-3 border-t border-border-muted">
          <Toggle
            checked={form.auto_rate}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                auto_rate: next,
                manual_rate_input: next && currentBcvRate
                  ? String(currentBcvRate.rate)
                  : current.manual_rate_input,
              }))
            }
            label="Tasa BCV automática"
            hint={
              isEditing
                ? "Al editar, la tasa registrada no cambia."
                : canUseAuto
                  ? `Usa la tasa en memoria: Bs ${formatBs(currentBcvRate!.rate)}.`
                  : "Sin conexión con DolarApi. Activa el modo manual para continuar."
            }
            disabled={isEditing || !canUseAuto}
          />

          {(!form.auto_rate || isEditing) && (
            <div className="pl-[50px]">
              <label className="block">
                <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
                  Tasa manual (Bs por 1 USD)
                </span>
                <div className="flex items-center bg-bg-main border border-[#2a3441] rounded-[10px] px-3 focus-within:border-brand transition-colors max-w-[220px]">
                  <span className="font-mono text-[15px] text-text-muted font-semibold">Bs</span>
                  <input
                    inputMode="decimal"
                    value={form.manual_rate_input}
                    onChange={(event) =>
                      setForm({ ...form, manual_rate_input: event.target.value })
                    }
                    disabled={isEditing}
                    placeholder="138,42"
                    className="flex-1 bg-transparent border-none py-2.5 px-2 text-base font-bold text-text-main font-mono outline-none disabled:opacity-70"
                  />
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between bg-bg-row border border-border-base rounded-[11px] px-4 py-3">
          <span className="text-[12.5px] text-text-secondary font-semibold">
            Equivale a (tasa Bs {effectiveRate > 0 ? formatBs(effectiveRate) : "—"})
          </span>
          <span className="font-mono text-[19px] font-bold text-expense">
            {usdPreview !== null ? `$${formatUsd(usdPreview)} USD` : "—"}
          </span>
        </div>

        {error && (
          <div className="text-[11.5px] text-expense">{error}</div>
        )}

        <div className="flex gap-3 mt-2">
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
                : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-bold text-text-secondary mb-1.5">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[10.5px] text-text-muted mt-1.5 leading-relaxed">
          {hint}
        </span>
      )}
    </label>
  );
}

/** Parse "1.234,56" or "1234.56" or "1234,56" into 1234.56. */
function parseSpanishNumber(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "") // remove thousand separators
    .replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}
