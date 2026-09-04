export interface UrgencyDescriptor {
  daysUntil: number;
  label: string;
  toneClass: string;
}

/**
 * Compute the urgency chip for a `due_date` relative to `today`.
 *
 * Rules per spec §3.5:
 *   - ≤ 3 days: red
 *   - 4–7 days: amber
 *   - > 7 days: neutral
 * Past-due dates surface as "vencido" in red.
 */
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

function daysBetween(from: Date, toIso: string): number {
  const [y, m, d] = toIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diffMs = target.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
