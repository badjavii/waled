import { clsx } from "clsx";
import { RotateCw } from "lucide-react";
import type { Reminder } from "@/ipc/types";
import { getAccountTypeMeta } from "@/lib/accountTypes";
import { formatIsoDateShort } from "@/lib/format";
import { describeUrgency } from "@/lib/reminders";

interface RemindersTableProps {
  reminders: Reminder[];
}

export function RemindersTable({ reminders }: RemindersTableProps) {
  return (
    <div className="bg-bg-card border border-border-strong rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-[2.4fr_1.2fr_1.3fr_120px] gap-3 px-4 py-3 border-b border-border-base bg-bg-row text-[10.5px] font-bold text-text-muted uppercase tracking-wider">
        <span>Cuenta</span>
        <span>Vence</span>
        <span>Periodicidad</span>
        <span className="text-right">Estado</span>
      </div>

      {reminders.map((reminder) => {
        const meta = getAccountTypeMeta(reminder.account_type);
        const { Icon } = meta;
        const urgency = describeUrgency(reminder.due_date);

        return (
          <div
            key={reminder.account_id}
            className="grid grid-cols-[2.4fr_1.2fr_1.3fr_120px] gap-3 px-4 py-3 border-b border-border-muted items-center last:border-b-0 hover:bg-bg-row/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={clsx(
                  "w-9 h-9 flex-shrink-0 rounded-[10px] flex items-center justify-center",
                  meta.avatarClass
                )}
              >
                <Icon size={16} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold truncate">
                  {reminder.name}
                </div>
                <div className="text-[11px] text-text-muted truncate">
                  {reminder.account_type}
                </div>
              </div>
            </div>

            <div
              className={clsx(
                "font-mono text-[12.5px] font-semibold whitespace-nowrap",
                urgency.daysUntil <= 3 ? "text-expense" : "text-text-secondary"
              )}
            >
              {formatIsoDateShort(reminder.due_date)}
            </div>

            <div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full">
                <RotateCw size={10} />
                cada {reminder.periodicity_days} días
              </span>
            </div>

            <div className="text-right">
              <span
                className={clsx(
                  "inline-block text-[11px] font-bold px-2.5 py-1 rounded-full",
                  urgency.toneClass
                )}
              >
                {urgency.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
