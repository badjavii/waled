//! Waled backend library entrypoint.
//!
//! Composes the Tauri application: wires shared state, starts the reminder
//! scheduler, and registers every IPC command declared in `commands.rs`.

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;
pub mod state;

use std::sync::Arc;

use tauri::Manager;

use crate::infrastructure::scheduler::bcv_rate_scheduler;
use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("app data directory must be resolvable");
            std::fs::create_dir_all(&data_dir).ok();
            let database_path = data_dir.join("waled.db");

            let state = AppState::bootstrap(&database_path)
                .expect("failed to bootstrap application state");

            bcv_rate_scheduler::spawn(
                state.bcv_state.clone(),
                Arc::clone(&state.bcv_provider),
            );

            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_wallets,
            commands::create_wallet,
            commands::update_wallet,
            commands::delete_wallet,
            commands::list_accounts,
            commands::create_account,
            commands::update_account,
            commands::delete_account,
            commands::list_transactions,
            commands::create_transaction,
            commands::update_transaction,
            commands::delete_transaction,
            commands::get_settings,
            commands::save_settings,
            commands::get_current_bcv_rate,
            commands::refresh_bcv_rate,
            commands::list_reminders,
            commands::trigger_reminder_email,
            commands::export_database,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Waled application");
}
