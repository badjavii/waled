import { invoke } from "@tauri-apps/api/core";
import type { BcvRate } from "./types";

/** Current session BCV rate, or null when offline / not yet fetched. */
export const getCurrentBcvRate = (): Promise<BcvRate | null> =>
  invoke("get_current_bcv_rate");

/** Force a fresh fetch from DolarApi. Rejects on network / API failures. */
export const refreshBcvRate = (): Promise<BcvRate> =>
  invoke("refresh_bcv_rate");
