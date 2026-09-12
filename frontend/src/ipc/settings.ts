import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type { Settings } from "./types";

export const getSettings = (): Promise<Settings> => invoke("get_settings");

export const saveSettings = (settings: Settings): Promise<Settings> =>
  invoke("save_settings", { settings });

/**
 * Ask the user to pick a base directory for Waled backups. If accepted,
 * the backend ensures the `waled-backups/` subtree exists and persists
 * the choice in settings. Returns the new Settings state, or null if
 * the user cancelled the picker.
 */
export async function configureBackupsDirectory(): Promise<Settings | null> {
  const chosen = await open({
    title: "Elegir carpeta de respaldos",
    directory: true,
    multiple: false,
  });
  if (!chosen || typeof chosen !== "string") return null;
  return invoke("configure_backups_directory", { directory: chosen });
}

/**
 * Open the native save dialog and, if the user picks a destination,
 * export the database snapshot to that path. Returns the final path
 * or `null` when the user cancelled.
 *
 * When a `backups_directory` is configured, the dialog opens pre-filled
 * inside `{backups_directory}/waled-backups/manual_backups/` with a
 * date-stamped filename. The user can still navigate anywhere and
 * override — configured directory is a suggestion, not a lock.
 */
export async function exportDatabaseToFile(
  backupsDirectory?: string
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const filename = `waled-respaldo-${today}.json`;
  const defaultPath =
    backupsDirectory && backupsDirectory.trim().length > 0
      ? `${backupsDirectory}/waled-backups/manual_backups/${filename}`
      : filename;

  const destination = await save({
    title: "Exportar base de datos",
    defaultPath,
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!destination) return null;
  await invoke("export_database", { destination });
  return destination;
}

/**
 * Trigger a full wipe of the local database. The backend validates that
 * `userNameConfirmation` matches the stored user_name and that a
 * backups_directory is configured. Creates a pre-wipe backup and
 * returns the path to that backup file.
 */
export const wipeDatabase = (userNameConfirmation: string): Promise<string> =>
  invoke("wipe_database", { userNameConfirmation });
