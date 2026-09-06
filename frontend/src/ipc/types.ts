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
  /** ISO 8601 UTC timestamp when the wallet was archived, or null if active. */
  archived_at: string | null;
}

export interface Account {
  id: string;
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  periodicity_days: number | null;
  notify: boolean;
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
  gas_webhook_url: string;
}

export interface BcvRate {
  rate: number;
  date: string;
  fetched_at: string;
}

export interface Reminder {
  account_id: string;
  name: string;
  account_type: AccountType;
  due_date: string;
  periodicity_days: number;
  ves_amount: number;
}
