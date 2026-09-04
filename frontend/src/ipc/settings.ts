import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { Settings } from "./types";

export const getSettings = (): Promise<Settings> => invoke("get_settings");

export const saveSettings = (settings: Settings): Promise<Settings> =>
  invoke("save_settings", { settings });

/**
 * Open the native save dialog and, if the user picks a destination,
 * export the database snapshot to that path. Returns the final path
 * or `null` when the user cancelled.
 */
export async function exportDatabaseToFile(): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const destination = await save({
    title: "Exportar base de datos",
    defaultPath: `waled-respaldo-${today}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!destination) return null;
  await invoke("export_database", { destination });
  return destination;
}
