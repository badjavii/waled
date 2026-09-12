export type AccountType =
  | "Servicios Básicos"
  | "Alimentación"
  | "Ocio"
  | "Transporte"
  | "Vivienda"
  | "Educación"
  | "Salud";

export interface Wallet {
  id: string;
  name: string;
  description: string;
  is_digital: boolean;
  archived_at: string | null;
}

export interface Account {
  id: string;
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  /** Day of month (1-31) the billing window opens. `null` for non-periodic. */
  start_day: number | null;
  /** Day of month (1-31) the payment is due. `null` for non-periodic. */
  due_day: number | null;
  notify: boolean;
  archived_at: string | null;
}

export interface Transaction {
  id: string;
  account_id: string;
  wallet_id: string;
  ves_amount: number;
  payment_date: string;
  created_at: string;
  description: string;
  payment_reference: string | null;
  bcv_rate_at_payment: number;
}

export interface Settings {
  user_name: string;
  user_email: string;
  /** Reminder digest webhook (Enviar ahora + connectivity ping). */
  gas_reminder_webhook_url: string;
  /** Sync webhook for periodic account CRUD and payment marks. */
  gas_sync_webhook_url: string;
  /** Base directory chosen by the user for all Waled backups. Empty
   *  when not configured — the app falls back to asking every time. */
  backups_directory: string;
}

export interface BcvRate {
  rate: number;
  date: string;
  fetched_at: string;
}

export type NotificationKind =
  | "open"
  | "middle"
  | "day_before"
  | "five_days_before";

export interface NextNotification {
  kind: NotificationKind;
  /** ISO "YYYY-MM-DD". */
  date: string;
  /** True when `date` falls in a different calendar month than the payment cycle. */
  crosses_month: boolean;
}

export interface Reminder {
  account_id: string;
  name: string;
  account_type: AccountType;
  start_day: number;
  due_day: number;
  /** ISO "YYYY-MM-DD" — the next relevant due date. */
  due_date: string;
  /** True if the cycle at `due_date` is paid. */
  is_paid: boolean;
  /** True if the account has any transaction in the current calendar month. */
  paid_in_current_month: boolean;
  /** ISO "YYYY-MM-DD" — the most recent payment date in the current month,
   *  or null if there is no payment this month. */
  paid_at: string | null;
  next_notification: NextNotification | null;
}
