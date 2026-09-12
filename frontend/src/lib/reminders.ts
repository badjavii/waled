import type { NextNotification, NotificationKind, Reminder } from "@/ipc/types";
import { formatIsoDateShort } from "@/lib/format";

export interface UrgencyDescriptor {
  daysUntil: number;
  label: string;
  toneClass: string;
}

export function describeUrgency(dueDate: string, today = new Date()): UrgencyDescriptor {
  const daysUntil = daysBetween(today, dueDate);

  if (daysUntil < 0) {
    return {
      daysUntil,
      label: daysUntil === -1 ? "vencido ayer" : `vencido hace ${-daysUntil} días`,
      toneClass: "text-expense bg-expense/12",
    };
  }
  if (daysUntil === 0) {
    return { daysUntil, label: "hoy", toneClass: "text-expense bg-expense/12" };
  }
  const label = daysUntil === 1 ? "en 1 día" : `en ${daysUntil} días`;
  if (daysUntil <= 3) return { daysUntil, label, toneClass: "text-expense bg-expense/12" };
  if (daysUntil <= 7) return { daysUntil, label, toneClass: "text-bcv bg-bcv/12" };
  return { daysUntil, label, toneClass: "text-text-secondary bg-bg-row" };
}

export function notificationKindLabel(kind: NotificationKind): string {
  switch (kind) {
    case "open": return "Apertura de plazo";
    case "middle": return "Mitad de plazo";
    case "day_before": return "Un día antes";
    case "five_days_before": return "Cinco días antes";
  }
}

export function describeNextNotification(next: NextNotification | null): string {
  if (!next) return "Sin avisos pendientes";
  const kindText = notificationKindLabel(next.kind);
  const dateText = formatIsoDateShort(next.date);
  const suffix = next.crosses_month ? " (mes anterior)" : "";
  return `${kindText} · ${dateText}${suffix}`;
}

export interface PartitionedReminders {
  upcoming: Reminder[];
  overdue: Reminder[];
  recentlyPaid: Reminder[];
}

/**
 * Partition reminders into three mutually exclusive sections.
 *
 * The backend has already filtered which reminders to emit (current
 * cycle always, next cycle only if its start_date is within the upcoming
 * window). This function just classifies each one by its state:
 *
 *   - **overdue**: due_date < today and not paid.
 *   - **recentlyPaid**: paid within the last `recentlyPaidDays` days.
 *   - **upcoming**: everything else (not paid, or paid but out of the
 *     recentlyPaid window; typically future due dates).
 *
 * A single account may appear in two sections at once (e.g. current cycle
 * in recentlyPaid + next cycle in upcoming). Callers must use a unique
 * key like `account_id + due_date` when rendering.
 */
export function partitionReminders(
  reminders: Reminder[],
  today = new Date(),
  recentlyPaidDays = 3,
): PartitionedReminders {
  const upcoming: Reminder[] = [];
  const overdue: Reminder[] = [];
  const recentlyPaid: Reminder[] = [];

  for (const reminder of reminders) {
    const daysUntilDue = daysBetween(today, reminder.due_date);
    const isPastDue = daysUntilDue < 0;

    if (reminder.paid_at) {
      const daysSincePayment = daysBetween(today, reminder.paid_at);
      const withinRecentWindow =
        daysSincePayment >= -recentlyPaidDays && daysSincePayment <= 0;
      if (withinRecentWindow) {
        recentlyPaid.push(reminder);
        continue;
      }
    }

    if (isPastDue && !reminder.is_paid) {
      overdue.push(reminder);
      continue;
    }

    if (!reminder.is_paid) {
      upcoming.push(reminder);
    }
  }

  upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));
  overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
  recentlyPaid.sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));

  return { upcoming, overdue, recentlyPaid };
}

function daysBetween(from: Date, toIso: string): number {
  const [y, m, d] = toIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diffMs = target.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
