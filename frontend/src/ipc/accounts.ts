import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountType } from "./types";

/** Payload accepted by `create_account` on the Rust side. */
export interface AccountInput {
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  /** Required (positive integer) when `is_periodic` is true; null otherwise. */
  periodicity_days: number | null;
  notify: boolean;
}

export const listAccounts = (): Promise<Account[]> =>
  invoke("list_accounts");

export const createAccount = (input: AccountInput): Promise<Account> =>
  invoke("create_account", { input });

/** The Rust command expects the full `Account` including its id. */
export const updateAccount = (account: Account): Promise<Account> =>
  invoke("update_account", { account });

export const deleteAccount = (id: string): Promise<void> =>
  invoke("delete_account", { id });
