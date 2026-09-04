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
  payment_date: string;        // "YYYY-MM-DD"
  created_at: string;           // ISO 8601 UTC
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
  date: string;                 // "YYYY-MM-DD"
  fetched_at: string;           // ISO 8601 UTC
}

export interface Reminder {
  account_id: string;
  name: string;
  account_type: AccountType;
  due_date: string;
  periodicity_days: number;
  ves_amount: number;
}
