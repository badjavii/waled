import { CheckCircle2 } from "lucide-react";
import type { Reminder } from "@/ipc/types";
import { getAccountTypeMeta } from "@/lib/accountTypes";
import { formatIsoDateShort } from "@/lib/format";

interface RecentlyPaidListProps {
  reminders: Reminder[];
}

export function RecentlyPaidList({ reminders }: RecentlyPaidListProps) {
  return (
    <div className="bg-bg-card border border-border-strong rounded-[14px] overflow-hidden">
      {reminders.map((reminder) => {
        const meta = getAccountTypeMeta(reminder.account_type);
        const { Icon } = meta;

        return (
          <div
            key={reminder.account_id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border-muted last:border-b-0"
          >
            <div className="w-8 h-8 flex-shrink-0 rounded-[9px] bg-brand/10 text-brand flex items-center justify-center">
              <Icon size={14} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-text-secondary truncate">
                {reminder.name}
              </div>
              <div className="text-[10.5px] text-text-muted truncate">
                {reminder.account_type} · Pagado el{" "}
                {reminder.paid_at ? formatIsoDateShort(reminder.paid_at) : "—"}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full whitespace-nowrap">
              <CheckCircle2 size={11} />
              Pagado
            </span>
          </div>
        );
      })}
    </div>
  );
}
