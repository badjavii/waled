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
 * Partition reminders into three mutually exclusive sections:
 *
 *   - **overdue**: cycle at `due_date` is unpaid and `due_date < today`.
 *   - **upcoming**: cycle is unpaid, `due_date >= today`, and falls within
 *     the next `upcomingWindowDays`.
 *   - **recentlyPaid**: account was paid in the current month and the
 *     latest payment (`paid_at`) is within the last `recentlyPaidDays` days.
 *
 * A reminder that doesn't match any category (paid but older than the
 * recently-paid window, or with a due date beyond the upcoming window)
 * is intentionally omitted to keep the screen focused on actionable state.
 */
export function partitionReminders(
  reminders: Reminder[],
  today = new Date(),
  upcomingWindowDays = 30,
  recentlyPaidDays = 3,
): PartitionedReminders {
  const upcoming: Reminder[] = [];
  const overdue: Reminder[] = [];
  const recentlyPaid: Reminder[] = [];

  for (const reminder of reminders) {
    if (reminder.paid_at) {
      const daysSincePayment = daysBetween(today, reminder.paid_at);
      if (daysSincePayment >= -recentlyPaidDays && daysSincePayment <= 0) {
        recentlyPaid.push(reminder);
      }
    }

    const daysUntilDue = daysBetween(today, reminder.due_date);

    if (daysUntilDue < 0 && !reminder.is_paid) {
      overdue.push(reminder);

      const nextMonthDueDate = getNextMonthDueDate(reminder.due_date, reminder.due_day);
      const daysUntilNext = daysBetween(today, nextMonthDueDate);

      if (daysUntilNext >= 0 && daysUntilNext <= upcomingWindowDays) {
        upcoming.push({
          ...reminder,
          due_date: nextMonthDueDate,
        });
      }
    } 
    else if (daysUntilDue >= 0 && daysUntilDue <= upcomingWindowDays) {
      upcoming.push(reminder);
    }
  }

  upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));
  overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
  recentlyPaid.sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));

  return { upcoming, overdue, recentlyPaid };
}

function getNextMonthDueDate(isoDate: string, dueDay: number): string {
  const [y, m] = isoDate.split("-").map(Number);
  let nextY = y;
  let nextM = m + 1;
  if (nextM > 12) {
    nextM = 1;
    nextY += 1;
  }
  const daysInNextMonth = new Date(nextY, nextM, 0).getDate();
  const clampedDay = Math.min(dueDay, daysInNextMonth);

  const mm = String(nextM).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${nextY}-${mm}-${dd}`;
}

function daysBetween(from: Date, toIso: string): number {
  const [y, m, d] = toIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diffMs = target.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
