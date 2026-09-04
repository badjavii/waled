import { useQuery } from "@tanstack/react-query";
import { Loader2, BellOff } from "lucide-react";
import { listReminders } from "@/ipc/reminders";
import { getSettings } from "@/ipc/settings";
import { RemindersHeader } from "@/components/reminders/RemindersHeader";
import { RemindersTable } from "@/components/reminders/RemindersTable";

export function RemindersScreen() {
  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: listReminders,
  });
  const settingsQuery = useQuery({ queryKey: ["settings"], queryFn: getSettings });

  const reminders = remindersQuery.data ?? [];
  const webhookConfigured =
    (settingsQuery.data?.gas_webhook_url ?? "").trim().length > 0;

  if (remindersQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-text-muted text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Cargando recordatorios…
      </div>
    );
  }

  return (
    <>
      {!webhookConfigured && (
        <div className="flex items-center gap-3 bg-bcv/[0.07] border border-bcv/25 rounded-[12px] px-4 py-3 mb-4">
          <BellOff size={16} className="text-bcv flex-shrink-0" />
          <div className="text-[12.5px] text-bcv">
            <b>Sin webhook configurado.</b>{" "}
            <span className="text-[#a99a6a]">
              El envío automático de correos está deshabilitado. Configúralo en
              Configuración → Webhook de recordatorios para activarlo.
            </span>
          </div>
        </div>
      )}

      <RemindersHeader count={reminders.length} />

      {reminders.length === 0 ? (
        <EmptyState />
      ) : (
        <RemindersTable reminders={reminders} />
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
      <div className="text-base font-bold mb-1">Sin recordatorios activos</div>
      <p className="text-sm text-text-muted max-w-md leading-relaxed">
        No hay cuentas periódicas con pagos por vencer en las próximas 3
        semanas. Los recordatorios se calculan a partir de las cuentas marcadas
        como periódicas y su última transacción registrada.
      </p>
    </div>
  );
}
