const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * Formats a number in Venezuelan notation with N decimal places.
 * Examples: 1450 -> "1.450,00", 138.42 -> "138,42".
 */
export function formatBs(value: number, decimals = 2): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Converts an ISO date format "YYYY-MM-DD" to the short format "DD mmm YYYY".
 */
export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const day = String(date.getDate()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Extracts the initials (max. 2) from a full name.
 * Empty strings return "?" so the avatar is never blank.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Format an ISO date "YYYY-MM-DD" as "DD/MM/YYYY" for mono-spaced columns. */
export function formatIsoDateShort(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Format an ISO 8601 UTC timestamp as "DD/MM/YYYY HH:MM" in local time. */
export function formatIsoDateTime(iso: string): string {
  const date = new Date(iso);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const mn = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mn}`;
}

/** Format a USD number as "X,XX" without prefix (prefix added by the caller). */
export function formatUsd(value: number): string {
  return value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Convert a Date to "YYYY-MM-DD" in local time (avoids UTC off-by-one). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
