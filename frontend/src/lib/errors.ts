/**
 * Domain error helpers that decode the string-based error protocol
 * used across the IPC boundary.
 *
 * The backend's `map_error` prefixes every serialized error with the
 * variant name (e.g. "NetworkRequired: no se pudo contactar…"). This
 * module provides typed detection so UI code doesn't do fragile string
 * checks inline.
 */

export type DomainErrorKind =
  | "Validation"
  | "NotFound"
  | "Persistence"
  | "NetworkRequired"
  | "Conflict"
  | "Notification"
  | "Unexpected"
  | "Unknown";

export interface ParsedDomainError {
  kind: DomainErrorKind;
  message: string;
  /** The full original serialized error, useful for developer-facing logs. */
  raw: string;
}

const PREFIXES: Array<[string, DomainErrorKind]> = [
  ["NetworkRequired:", "NetworkRequired"],
  ["Validation:", "Validation"],
  ["NotFound:", "NotFound"],
  ["Persistence:", "Persistence"],
  ["Conflict:", "Conflict"],
  ["Notification:", "Notification"],
  ["Unexpected:", "Unexpected"],
];

/**
 * Decode an error returned by a Tauri command into its typed form.
 * Accepts any unknown value: strings are parsed by prefix, Error
 * instances are unwrapped, and anything else becomes "Unknown".
 */
export function parseDomainError(err: unknown): ParsedDomainError {
  const raw = err instanceof Error ? err.message : String(err);
  for (const [prefix, kind] of PREFIXES) {
    if (raw.startsWith(prefix)) {
      return { kind, message: raw.slice(prefix.length).trim(), raw };
    }
  }
  return { kind: "Unknown", message: raw, raw };
}

/** Convenience predicate for the most common branching case in the UI. */
export function isNetworkRequired(err: unknown): boolean {
  return parseDomainError(err).kind === "NetworkRequired";
}
