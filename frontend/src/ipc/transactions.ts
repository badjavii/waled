import { invoke } from "@tauri-apps/api/core";
import type { Transaction } from "./types";

/** Payload accepted by `create_transaction` / `update_transaction` on the Rust side. */
export interface TransactionInput {
  account_id: string;
  wallet_id: string;
  ves_amount: number;
  payment_date: string; // "YYYY-MM-DD"
  description: string;
  payment_reference: string | null;
  bcv_rate_at_payment: number;
}

export const listTransactions = (): Promise<Transaction[]> =>
  invoke("list_transactions");

export const createTransaction = (input: TransactionInput): Promise<Transaction> =>
  invoke("create_transaction", { input });

export const updateTransaction = (
  id: string,
  input: TransactionInput
): Promise<Transaction> => invoke("update_transaction", { id, input });

export const deleteTransaction = (id: string): Promise<void> =>
  invoke("delete_transaction", { id });
