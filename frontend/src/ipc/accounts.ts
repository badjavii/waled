import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountType } from "./types";

export interface AccountInput {
  name: string;
  description: string;
  account_type: AccountType;
  is_periodic: boolean;
  start_day: number | null;
  due_day: number | null;
  notify: boolean;
}

export const listAccounts = (): Promise<Account[]> =>
  invoke("list_accounts");

export const listAllAccounts = (): Promise<Account[]> =>
  invoke("list_all_accounts");

export const createAccount = (input: AccountInput): Promise<Account> =>
  invoke("create_account", { input });

export const updateAccount = (account: Account): Promise<Account> =>
  invoke("update_account", { account });

export const deleteAccount = (id: string): Promise<void> =>
  invoke("delete_account", { id });
