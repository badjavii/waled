import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { triggerReminderEmail } from "@/ipc/reminders";

interface RemindersHeaderProps {
  count: number;
}

export function RemindersHeader({ count }: RemindersHeaderProps) {
  const dispatch = useMutation({
    mutationFn: triggerReminderEmail,
    onSuccess: () => {
      toast.success("Recordatorio enviado", {
        description: "Revisa tu correo en los próximos minutos.",
      });
    },
    onError: (err: unknown) => {
      toast.error("No se pudo enviar el recordatorio", {
        description: String(err),
      });
    },
  });

  return (
    <div className="flex items-start gap-5 mb-5 flex-wrap">
      <p className="text-[12.5px] text-text-muted flex-1 min-w-[280px] leading-relaxed">
        Cuentas periódicas que vencen en las próximas 3 semanas, en orden
        cronológico. El envío automático corre en segundo plano; también puedes
        forzarlo desde aquí.
      </p>

      <button
        type="button"
        onClick={() => dispatch.mutate()}
        disabled={dispatch.isPending || count === 0}
        title={
          count === 0
            ? "No hay recordatorios que enviar"
            : "Enviar ahora el resumen por correo"
        }
        className="flex items-center gap-1.5 bg-brand text-[#05130d] font-bold text-[12.5px] px-4 py-2.5 rounded-[10px] shadow-lg shadow-brand/25 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {dispatch.isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Mail size={14} />
        )}
        {dispatch.isPending ? "Enviando…" : "Enviar ahora"}
      </button>
    </div>
  );
}
