import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Zap,
  User,
  Webhook,
  HardDrive,
  AlertTriangle,
  Download,
  FolderOpen,
  } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  getSettings,
  saveSettings,
  exportDatabaseToFile,
  configureBackupsDirectory,
  } from "@/ipc/settings";
import { pingReminderWebhook } from "@/ipc/reminders";
import type { Settings } from "@/ipc/types";
import { wipeDatabase } from "@/ipc/settings";
import { WipeConfirmModal } from "@/components/ui/WipeConfirmModal";
import { Trash2 } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabType = "profile" | "webhooks" | "backups" | "danger";

const EMPTY_SETTINGS: Settings = {
  user_name: "",
  user_email: "",
  gas_reminder_webhook_url: "",
  gas_sync_webhook_url: "",
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    enabled: open,
  });

  const [form, setForm] = useState<Settings>(EMPTY_SETTINGS);

  useEffect(() => {
    if (open && data) setForm(data);
  }, [open, data]);

  const saveMutation = useMutation({
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

  const wipeMutation = useMutation({
    mutationFn: () => wipeDatabase(form.user_name),
    onSuccess: (backupPath) => {
      // Invalidate everything the wipe affected.
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      // Reset the local form so the Profile tab reflects the wiped state.
      setForm(EMPTY_SETTINGS);
      // Close the wipe modal and switch to Profile so the user reconfigures.
      setWipeConfirmOpen(false);
      setActiveTab("profile");
      toast.success("Aplicación restablecida", {
        description: `Respaldo guardado en: ${backupPath}`,
        duration: 8000,
      });
    },
    onError: (err: unknown) => {
      toast.error("No se pudo restablecer la aplicación", {
        description: String(err),
      });
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveMutation.mutate(form);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Configuración"
        subtitle="Opciones de cuenta, sincronización y datos"
      >
        {isLoading ? (
          <div className="text-text-muted text-sm py-6 text-center">
            Cargando configuración…
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Navegación por pestañas */}
            <div className="flex border-b border-border-muted mb-5 gap-1">
              <TabButton
                active={activeTab === "profile"}
                onClick={() => setActiveTab("profile")}
                icon={<User size={14} />}
                label="Perfil"
              />
              <TabButton
                active={activeTab === "webhooks"}
                onClick={() => setActiveTab("webhooks")}
                icon={<Webhook size={14} />}
                label="Webhooks"
              />
              <TabButton
                active={activeTab === "backups"}
                onClick={() => setActiveTab("backups")}
                icon={<HardDrive size={14} />}
                label="Respaldos"
              />
              <TabButton
                active={activeTab === "danger"}
                onClick={() => setActiveTab("danger")}
                icon={<AlertTriangle size={14} />}
                label="Zona de Peligro"
              />
            </div>

            {/* Contenido según pestaña activa */}
            <div className="min-h-[220px]">
              {activeTab === "profile" && (
                <ProfileTab form={form} setForm={setForm} />
              )}
              {activeTab === "webhooks" && (
                <WebhooksTab form={form} setForm={setForm} />
              )}
              {activeTab === "backups" && <BackupsTab />}
              {activeTab === "danger" && (
                <DangerTab
                  currentUserName={form.user_name}
                  onOpenWipe={() => setWipeConfirmOpen(true)}
                />
              )}
            </div>

            {/* Botones de acción inferiores */}
            <div className="flex gap-3 mt-6 border-t border-border-muted pt-4">
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                disabled={saveMutation.isPending}
                className="bg-[#151c25] border border-border-strong text-text-main font-semibold text-sm px-5 py-2.5 rounded-[11px] hover:bg-bg-row transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="bg-brand text-[#05130d] font-bold text-sm px-6 py-2.5 rounded-[11px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50"
              >
                {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <WipeConfirmModal
        open={wipeConfirmOpen}
        onClose={() => setWipeConfirmOpen(false)}
        onConfirm={() => wipeMutation.mutate()}
        expectedName={form.user_name}
        wiping={wipeMutation.isPending}
      />
    </>
  );
}

function ProfileTab({
  form,
  setForm,
}: {
  form: Settings;
  setForm: (f: Settings) => void;
}) {
  return (
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
    </div>
  );
}

function WebhooksTab({
  form,
  setForm,
}: {
  form: Settings;
  setForm: (f: Settings) => void;
}) {
  const pingMutation = useMutation({
    mutationFn: (url: string) => pingReminderWebhook(url),
    onSuccess: () => {
      toast.success("Conexión exitosa", {
        description: "El webhook respondió correctamente.",
      });
    },
    onError: (err: unknown) => {
      toast.error("No se pudo conectar con el webhook", {
        description: String(err),
      });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Webhook de Recordatorios (GAS)"
        hint="URL del script encargado del despacho de notificaciones por correo."
      >
        <div className="flex gap-2">
          <input
            type="url"
            value={form.gas_reminder_webhook_url}
            onChange={(e) =>
              setForm({ ...form, gas_reminder_webhook_url: e.target.value })
            }
            placeholder="https://script.google.com/macros/s/…/exec"
            className="input font-mono flex-1"
          />
          <button
            type="button"
            onClick={() => pingMutation.mutate(form.gas_reminder_webhook_url)}
            disabled={
              !form.gas_reminder_webhook_url.trim() || pingMutation.isPending
            }
            className="flex items-center gap-1.5 bg-[#151c25] border border-border-strong text-text-secondary hover:text-text-main font-semibold text-[12px] px-3 rounded-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {pingMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Zap size={13} />
            )}
            Probar
          </button>
        </div>
      </Field>

      <Field
        label="Webhook de Sincronización (GAS)"
        hint="URL del script que recibe las mutaciones en tiempo real para el modo Strict Online."
      >
        <div className="flex gap-2">
          <input
            type="url"
            value={form.gas_sync_webhook_url}
            onChange={(e) =>
              setForm({ ...form, gas_sync_webhook_url: e.target.value })
            }
            placeholder="https://script.google.com/macros/s/…/exec"
            className="input font-mono flex-1"
          />
          <button
            type="button"
            onClick={() => pingMutation.mutate(form.gas_sync_webhook_url)}
            disabled={
              !form.gas_sync_webhook_url.trim() || pingMutation.isPending
            }
            className="flex items-center gap-1.5 bg-[#151c25] border border-border-strong text-text-secondary hover:text-text-main font-semibold text-[12px] px-3 rounded-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {pingMutation.isPending ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Zap size={13} />
            )}
            Probar
          </button>
        </div>
      </Field>
    </div>
  );
}

function BackupsTab() {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });
  const backupsDirectory = settingsQuery.data?.backups_directory ?? "";

  const configureDirMutation = useMutation({
    mutationFn: configureBackupsDirectory,
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(["settings"], updated);
        toast.success("Carpeta de respaldos configurada", {
          description: updated.backups_directory,
        });
      }
    },
    onError: (err: unknown) => {
      toast.error("No se pudo configurar la carpeta", {
        description: String(err),
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => exportDatabaseToFile(backupsDirectory),
    onSuccess: (path) => {
      if (path) {
        toast.success("Respaldo exportado", { description: path });
      }
    },
    onError: (err: unknown) => {
      toast.error("No se pudo exportar el respaldo", {
        description: String(err),
      });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Configuración de carpeta base */}
      <div className="bg-bg-row border border-border-muted rounded-[10px] px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-text-main">
              Carpeta de respaldos
            </div>
            <p className="text-[11.5px] text-text-muted mt-0.5 leading-relaxed">
              Waled organizará todos tus respaldos (manuales, de importación
              y de limpieza) dentro de{" "}
              <code className="text-text-secondary bg-bg-main/60 px-1 rounded">
                waled-backups/
              </code>{" "}
              en la carpeta que elijas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => configureDirMutation.mutate()}
            disabled={configureDirMutation.isPending}
            className="flex items-center gap-1.5 bg-[#151c25] border border-border-strong text-text-secondary hover:text-text-main font-semibold text-[12px] px-3 py-2 rounded-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <FolderOpen size={13} />
            {backupsDirectory ? "Cambiar" : "Elegir carpeta"}
          </button>
        </div>
        <div className="text-[11px] font-mono text-text-muted bg-bg-main/60 border border-border-muted/60 rounded-[8px] px-3 py-2 break-all">
          {backupsDirectory || "No configurado"}
        </div>
      </div>

      {/* Exportar respaldo */}
      <div className="flex items-center justify-between gap-3 bg-bg-row border border-border-muted rounded-[10px] px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text-main">
            Exportar respaldo ahora
          </div>
          <p className="text-[11.5px] text-text-muted mt-0.5 leading-relaxed">
            Genera un archivo JSON con todas tus billeteras, cuentas y
            transacciones.{" "}
            {backupsDirectory
              ? "Se sugerirá guardar dentro de manual_backups/."
              : "Guárdalo donde quieras."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
          className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-[12.5px] px-3.5 py-2 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50 whitespace-nowrap"
        >
          <Download size={13} />
          {exportMutation.isPending ? "Exportando…" : "Exportar JSON"}
        </button>
      </div>

      <ComingSoonBanner
        title="Importar respaldo"
        message="En la próxima entrega podrás restaurar la app desde un archivo JSON exportado previamente. Se generará un respaldo automático de tu estado actual antes de importar."
      />
    </div>
  );
}

function DangerTab({
  currentUserName,
  onOpenWipe,
}: {
  currentUserName: string;
  onOpenWipe: () => void;
}) {
  const backupsConfigured = currentUserName.trim().length > 0; // será refinado con backupsDirectory abajo

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-expense/[0.04] border border-expense/25 rounded-[10px] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-expense/12 text-expense flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-expense mb-1">
              Restablecer aplicación
            </div>
            <p className="text-[11.5px] text-text-secondary leading-relaxed">
              Borra permanentemente todas tus billeteras, cuentas, transacciones
              y perfil. Se generará un respaldo automático en{" "}
              <code className="text-text-secondary bg-bg-main/60 px-1 rounded">
                wipe_backups/
              </code>{" "}
              antes de proceder.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenWipe}
            className="flex items-center gap-1.5 bg-expense text-white font-bold text-[12.5px] px-3.5 py-2 rounded-[10px] hover:brightness-110 transition-all whitespace-nowrap self-start"
          >
            <Trash2 size={13} />
            Restablecer
          </button>
        </div>
      </div>

      <p className="text-[11px] text-text-muted leading-relaxed">
        Necesitarás escribir tu nombre exacto para confirmar. Si no tienes una
        carpeta de respaldos configurada, ve a la pestaña <b>Respaldos</b> antes
        de restablecer.
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold rounded-t-lg transition-colors border-b-2 -mb-[1px] ${
        active
          ? "border-brand text-brand bg-bg-row/50"
          : "border-transparent text-text-muted hover:text-text-secondary"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ComingSoonBanner({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="bg-bg-main/50 border border-border-muted/60 rounded-[10px] p-3.5 opacity-70">
      <div className="text-[12.5px] font-semibold text-text-muted flex items-center gap-2">
        <span>{title}</span>
        <span className="text-[10px] uppercase font-bold bg-[#1d2733] text-text-muted px-1.5 py-0.5 rounded">
          Próximamente
        </span>
      </div>
      <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
        {message}
      </p>
    </div>
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
