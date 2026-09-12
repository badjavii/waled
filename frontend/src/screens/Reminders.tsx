import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BellOff, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { listReminders } from "@/ipc/reminders";
import { getSettings } from "@/ipc/settings";
import { partitionReminders } from "@/lib/reminders";
import { RemindersHeader } from "@/components/reminders/RemindersHeader";
import { RemindersTable } from "@/components/reminders/RemindersTable";
import { OverdueTable } from "@/components/reminders/OverdueTable";
import { RecentlyPaidList } from "@/components/reminders/RecentlyPaidList";

const RECENTLY_PAID_DAYS = 3;

interface RemindersScreenProps {
  onOpenSettings: () => void;
}

export function RemindersScreen({ onOpenSettings }: RemindersScreenProps) {
  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: listReminders,
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const partitioned = useMemo(
    () =>
      partitionReminders(
        remindersQuery.data ?? [],
        new Date(),
        RECENTLY_PAID_DAYS
      ),
    [remindersQuery.data]
  );

  const webhookConfigured =
    (settingsQuery.data?.gas_reminder_webhook_url ?? "").trim().length > 0;

  if (remindersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando recordatorios…
      </div>
    );
  }

  const totalReminders = remindersQuery.data?.length ?? 0;
  const hasUpcoming = partitioned.upcoming.length > 0;
  const hasOverdue = partitioned.overdue.length > 0;
  const hasRecentlyPaid = partitioned.recentlyPaid.length > 0;
  const anySection = hasUpcoming || hasOverdue || hasRecentlyPaid;

  return (
    <>
      {!webhookConfigured && (
        <div className="flex items-center gap-3 bg-bcv/[0.07] border border-bcv/25 rounded-[12px] px-4 py-3 mb-4">
          <BellOff size={16} className="text-bcv flex-shrink-0" />
          <div className="flex-1 text-[12.5px] text-bcv">
            <b>Sin webhook configurado.</b>{" "}
            <span className="text-[#a99a6a]">
              El envío automático de correos está deshabilitado. Configúralo
              para activar los recordatorios por email.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 bg-bcv/12 hover:bg-bcv/20 border border-bcv/30 text-bcv font-semibold text-[12px] px-3 py-1.5 rounded-[9px] transition-colors whitespace-nowrap"
          >
            <SettingsIcon size={12} />
            Configurar
          </button>
        </div>
      )}

      <RemindersHeader count={totalReminders} />

      {totalReminders === 0 ? (
        <EmptyState />
      ) : !anySection ? (
        <AllQuietState />
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <SectionHeading
              title="Próximos pagos"
              subtitle="Cuentas periódicas que vencen en los próximos 30 días en orden cronológico."
            />
            {hasUpcoming ? (
              <RemindersTable reminders={partitioned.upcoming} />
            ) : (
              <SectionEmpty
                icon={<CheckCircle2 size={18} className="text-brand" />}
                message="No hay vencimientos programados en los próximos 30 días."
              />
            )}
          </section>

          {hasOverdue && (
            <section>
              <SectionHeading
                title="Vencidos"
                subtitle="Registra una transacción asociada para saldar estos recordatorios y pasarlos a pagados."
                tone="warning"
              />
              <OverdueTable reminders={partitioned.overdue} />
            </section>
          )}

          {hasRecentlyPaid && (
            <section>
              <SectionHeading
                title="Recientemente pagados"
                subtitle="Cuentas con pagos registrados en los últimos 3 días."
              />
              <RecentlyPaidList reminders={partitioned.recentlyPaid} />
            </section>
          )}

          <p className="text-[11px] text-text-muted text-center pt-2 leading-relaxed">
            Los recordatorios pagados hace más de 3 días se ocultan
            automáticamente para mantener tu vista limpia. Puedes consultar
            todo el historial en la sección Transacciones.
          </p>
        </div>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <BellOff size={26} className="text-brand" strokeWidth={2} />
      </div>
      <div className="text-base font-bold mb-1">Sin cuentas periódicas activas</div>
      <p className="text-sm text-text-muted max-w-md leading-relaxed">
        Crea cuentas periódicas desde la pantalla de Cuentas para empezar a
        recibir recordatorios de sus vencimientos mensuales.
      </p>
    </div>
  );
}

function AllQuietState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
        <CheckCircle2 size={26} className="text-brand" strokeWidth={2} />
      </div>
      <div className="text-base font-bold mb-1">Todo al día</div>
      <p className="text-sm text-text-muted max-w-md leading-relaxed">
        No hay recordatorios en las secciones activas. Tus cuentas están al
        corriente y sin vencimientos cercanos.
      </p>
    </div>
  );
}

interface SectionHeadingProps {
  title: string;
  subtitle: string;
  tone?: "default" | "warning";
}

function SectionHeading({ title, subtitle, tone = "default" }: SectionHeadingProps) {
  const isWarning = tone === "warning";
  return (
    <div className="mb-3">
      <h2
        className={
          isWarning
            ? "text-[15px] font-bold text-expense"
            : "text-[15px] font-bold text-text-main"
        }
      >
        {title}
      </h2>
      <p className="text-[11.5px] text-text-muted mt-0.5">{subtitle}</p>
    </div>
  );
}

interface SectionEmptyProps {
  icon: React.ReactNode;
  message: string;
}

function SectionEmpty({ icon, message }: SectionEmptyProps) {
  return (
    <div className="flex items-center gap-3 bg-bg-card border border-border-strong rounded-[12px] px-4 py-4">
      {icon}
      <p className="text-[12.5px] text-text-secondary">{message}</p>
    </div>
  );
}
