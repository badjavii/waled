import { invoke } from "@tauri-apps/api/core";
import type { Wallet } from "./types";

/** Payload accepted by `create_wallet` on the Rust side. */
export interface WalletInput {
  name: string;
  description: string;
  is_digital: boolean;
}

/** Only active (non-archived) wallets. Used for listings and for the
 *  wallet selector when creating or editing transactions. */
export const listWallets = (): Promise<Wallet[]> =>
  invoke("list_wallets");

/** All wallets including archived. Used by read-only views (transactions
 *  history table, transaction details modal) to correctly display the
 *  name of a wallet even after it was archived. */
export const listAllWallets = (): Promise<Wallet[]> =>
  invoke("list_all_wallets");

export const createWallet = (input: WalletInput): Promise<Wallet> =>
  invoke("create_wallet", { input });

export const updateWallet = (wallet: Wallet): Promise<Wallet> =>
  invoke("update_wallet", { wallet });

export const deleteWallet = (id: string): Promise<void> =>
  invoke("delete_wallet", { id });
