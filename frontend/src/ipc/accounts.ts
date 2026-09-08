import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountType } from "./types";

export interface AccountInput {
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  periodicity_days: number | null;
  notify: boolean;
}

/** Only active (non-archived) accounts. Used for the Accounts screen
 *  listing and for the account selector when creating transactions. */
export const listAccounts = (): Promise<Account[]> =>
  invoke("list_accounts");

/** All accounts including archived. Used by read-only views to
 *  correctly hydrate account references in historical transactions
 *  and in dashboard aggregates. */
export const listAllAccounts = (): Promise<Account[]> =>
  invoke("list_all_accounts");

export const createAccount = (input: AccountInput): Promise<Account> =>
  invoke("create_account", { input });

export const updateAccount = (account: Account): Promise<Account> =>
  invoke("update_account", { account });

export const deleteAccount = (id: string): Promise<void> =>
  invoke("delete_account", { id });
