import { invoke } from "@tauri-apps/api/core";
import type { Wallet } from "./types";

/** Payload accepted by `create_wallet` on the Rust side. */
export interface WalletInput {
  name: string;
  description: string;
  is_digital: boolean;
}

export const listWallets = (): Promise<Wallet[]> =>
  invoke("list_wallets");

export const createWallet = (input: WalletInput): Promise<Wallet> =>
  invoke("create_wallet", { input });

/** The Rust command expects the full `Wallet` including its id. */
export const updateWallet = (wallet: Wallet): Promise<Wallet> =>
  invoke("update_wallet", { wallet });

export const deleteWallet = (id: string): Promise<void> =>
  invoke("delete_wallet", { id });
