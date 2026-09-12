import { AlertTriangle, RotateCw } from "lucide-react";
import type { Reminder } from "@/ipc/types";
import { getAccountTypeMeta } from "@/lib/accountTypes";
import { formatIsoDateShort } from "@/lib/format";
import { describeUrgency } from "@/lib/reminders";

interface OverdueTableProps {
  reminders: Reminder[];
}

export function OverdueTable({ reminders }: OverdueTableProps) {
  return (
    <div className="bg-expense/[0.04] border border-expense/25 rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-[2fr_1.2fr_1.4fr_140px] gap-3 px-4 py-3 border-b border-expense/15 bg-expense/[0.06] text-[10.5px] font-bold text-expense uppercase tracking-wider">
        <span>Cuenta</span>
        <span>Ventana</span>
        <span>Estado</span>
        <span className="text-right">Vencía</span>
      </div>

      {reminders.map((reminder) => {
        const meta = getAccountTypeMeta(reminder.account_type);
        const { Icon } = meta;
        const urgency = describeUrgency(reminder.due_date);
        const windowLabel =
          reminder.start_day === reminder.due_day
            ? `Día ${reminder.due_day}`
            : `Del ${reminder.start_day} al ${reminder.due_day}`;

        return (
          <div
            key={`${reminder.account_id}-${reminder.due_date}`}
            className="grid grid-cols-[2fr_1.2fr_1.4fr_140px] gap-3 px-4 py-3 border-b border-expense/15 items-center last:border-b-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 flex-shrink-0 rounded-[10px] bg-expense/10 text-expense flex items-center justify-center">
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

            <div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-1 rounded-full whitespace-nowrap">
                <RotateCw size={10} />
                {windowLabel}
              </span>
            </div>

            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-expense bg-expense/12 px-2.5 py-1 rounded-full">
                <AlertTriangle size={11} />
                Sin pagar
              </span>
            </div>

            <div className="text-right">
              <div className="font-mono text-[12px] font-semibold text-expense whitespace-nowrap">
                {formatIsoDateShort(reminder.due_date)}
              </div>
              <div className="inline-block text-[10px] font-bold text-expense bg-expense/12 px-2 py-0.5 rounded-full mt-1">
                {urgency.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
