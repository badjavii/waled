import { invoke } from "@tauri-apps/api/core";
import type { Reminder } from "./types";

export const listReminders = (): Promise<Reminder[]> =>
  invoke("list_reminders");

/** Force the immediate dispatch of the reminder digest email. */
export const triggerReminderEmail = (): Promise<void> =>
  invoke("trigger_reminder_email");
