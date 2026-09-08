import { invoke } from "@tauri-apps/api/core";
import type { Reminder } from "./types";

export const listReminders = (): Promise<Reminder[]> =>
  invoke("list_reminders");

/** Force the immediate dispatch of the reminder digest email. */
export const triggerReminderEmail = (): Promise<void> =>
  invoke("trigger_reminder_email");

/**
 * Send a lightweight ping to the configured reminder webhook to verify
 * connectivity. Resolves on success (any 2xx from Google Apps Script)
 * or rejects with an error message describing the failure.
 */
export const pingReminderWebhook = (url?: string): Promise<void> =>
  invoke("ping_reminder_webhook", { url });
