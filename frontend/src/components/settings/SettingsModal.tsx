import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { exportDatabaseToFile, getSettings, saveSettings } from "@/ipc/settings";
import type { Settings } from "@/ipc/types";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_SETTINGS: Settings = {
  user_name: "",
  user_email: "",
  gas_webhook_url: "",
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    enabled: open,
  });

  const [form, setForm] = useState<Settings>(EMPTY_SETTINGS);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open && data) setForm(data);
  }, [open, data]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(["settings"], saved);
      toast.success("Configuración guardada");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error("No se pudo guardar", { description: String(error) });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate(form);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const destination = await exportDatabaseToFile();
      if (destination) {
        toast.success("Respaldo exportado", { description: destination });
      }
    } catch (error) {
      toast.error("No se pudo exportar", { description: String(error) });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configuración"
      subtitle="Perfil y datos de la aplicación"
    >
      {isLoading ? (
        <div className="text-text-muted text-sm py-6 text-center">
          Cargando configuración…
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            <Field label="Nombre">
              <input
                value={form.user_name}
                onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                placeholder="Tu nombre"
                className="input"
                autoFocus
              />
            </Field>

            <Field label="Correo electrónico">
              <input
                type="email"
                inputMode="email"
                value={form.user_email}
                onChange={(e) => setForm({ ...form, user_email: e.target.value })}
                placeholder="tu@correo.com"
                className="input font-mono"
              />
            </Field>

            <Field
              label="Webhook de recordatorios"
              hint="URL del Google Apps Script que envía los correos automáticos."
            >
              <input
                type="url"
                inputMode="url"
                value={form.gas_webhook_url}
                onChange={(e) => setForm({ ...form, gas_webhook_url: e.target.value })}
                placeholder="https://script.google.com/macros/s/…/exec"
                className="input font-mono"
              />
            </Field>

            <div className="flex items-center justify-between gap-4 bg-bg-main border border-[#2a3441] rounded-[10px] px-4 py-3.5 mt-1">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">Exportar datos</div>
                <div className="text-[11px] text-text-muted mt-0.5">
                  Copia de seguridad de cuentas, billeteras y transacciones.
                </div>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-1.5 bg-[#151c25] border border-border-strong text-brand font-semibold text-[12.5px] px-3.5 py-2.5 rounded-[10px] hover:bg-bg-row transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                {exporting ? "Exportando…" : "JSON"}
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
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
              {mutation.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
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
