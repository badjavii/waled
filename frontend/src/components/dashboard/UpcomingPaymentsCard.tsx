import { clsx } from "clsx";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Reminder } from "@/ipc/types";
import { getAccountTypeMeta } from "@/lib/accountTypes";
import { formatIsoDateShort } from "@/lib/format";
import { describeUrgency } from "@/lib/reminders";

interface UpcomingPaymentsCardProps {
  reminders: Reminder[];
  onSeeAll: () => void;
}

export function UpcomingPaymentsCard({
  reminders,
  onSeeAll,
}: UpcomingPaymentsCardProps) {
  // Show pending first, then paid; take top 5 total.
  const sorted = [...reminders].sort((a, b) => {
    if (a.is_paid !== b.is_paid) return a.is_paid ? 1 : -1;
    return a.due_date.localeCompare(b.due_date);
  });
  const top = sorted.slice(0, 5);

  return (
    <section className="bg-bg-card border border-border-strong rounded-2xl p-5 flex flex-col">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-[15px] font-bold">Top 5 próximos pagos</h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="text-[12.5px] font-semibold text-brand hover:brightness-125 flex items-center gap-1 transition-all"
        >
          Ver recordatorios <ArrowRight size={12} />
        </button>
      </div>

      {top.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-[13px] py-8 text-center">
          No hay cuentas periódicas activas.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 flex-1">
          {top.map((reminder) => (
            <UpcomingRow key={`${reminder.account_id}-${reminder.due_date}`} reminder={reminder} />
          ))}
        </div>
      )}
    </section>
  );
}

function UpcomingRow({ reminder }: { reminder: Reminder }) {
  const meta = getAccountTypeMeta(reminder.account_type);
  const { Icon } = meta;
  const urgency = describeUrgency(reminder.due_date);

  return (
    <div className="flex items-center gap-3.5 px-3.5 py-2.5 bg-bg-row border border-border-base rounded-xl">
      <div
        className={clsx(
          "w-10 h-10 flex-shrink-0 rounded-[11px] flex items-center justify-center",
          reminder.is_paid ? "bg-brand/10 text-brand" : meta.avatarClass
        )}
      >
        {reminder.is_paid ? (
          <CheckCircle2 size={17} strokeWidth={2} />
        ) : (
          <Icon size={17} strokeWidth={2} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold truncate">{reminder.name}</div>
        <div className="text-[11px] text-text-muted mt-0.5">
          {reminder.account_type}
        </div>
      </div>
      <div className="font-mono text-[12.5px] text-text-secondary whitespace-nowrap">
        {formatIsoDateShort(reminder.due_date)}
      </div>
      <div className="w-[100px] text-right">
        {reminder.is_paid ? (
          <span className="inline-block text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">
            pagado
          </span>
        ) : (
          <span
            className={clsx(
              "inline-block text-[11px] font-bold px-2.5 py-1 rounded-full",
              urgency.toneClass
            )}
          >
            {urgency.label}
          </span>
        )}
      </div>
    </div>
  );
}
