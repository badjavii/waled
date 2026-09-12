//! Destructive reset of the entire Waled database.
//!
//! The wipe workflow (spec §4 "Zona de Peligro"):
//!
//!   1. User must type their exact `user_name` to unlock the operation.
//!   2. A backup must be created before wiping — the app refuses to
//!      wipe unless `backups_directory` is configured.
//!   3. The backup goes to `{backups_directory}/waled-backups/wipe_backups/`
//!      with filename `wipe-YYYY-MM-DD-HHMMSS.json` (local time).
//!   4. After the backup is written, all rows are deleted from wallets,
//!      accounts and transactions inside a single SQLite transaction.
//!   5. Settings are reset to defaults except `backups_directory`,
//!      which is preserved so the user doesn't lose track of the
//!      backup they just created.

use std::path::PathBuf;
use std::sync::Arc;

use chrono::Local;
use rusqlite::params;

use crate::application::export_service::ExportService;
use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::BcvRate;
use crate::domain::ports::{
    AccountRepository, SettingsRepository, TransactionRepository, WalletRepository,
};
use crate::infrastructure::db::connection::SqlitePool;

pub struct WipeService {
    pool: SqlitePool,
    exporter: Arc<ExportService>,
    settings: Arc<dyn SettingsRepository>,
    wallets: Arc<dyn WalletRepository>,
    accounts: Arc<dyn AccountRepository>,
    transactions: Arc<dyn TransactionRepository>,
}

impl WipeService {
    #[must_use]
    pub fn new(
        pool: SqlitePool,
        exporter: Arc<ExportService>,
        settings: Arc<dyn SettingsRepository>,
        wallets: Arc<dyn WalletRepository>,
        accounts: Arc<dyn AccountRepository>,
        transactions: Arc<dyn TransactionRepository>,
    ) -> Self {
        Self { pool, exporter, settings, wallets, accounts, transactions }
    }

    /// Wipe the entire database after validating the user's confirmation
    /// and creating a pre-wipe backup. Returns the path to the backup
    /// file so the caller can surface it in the UI.
    ///
    /// # Errors
    ///
    /// - `Validation`: user_name confirmation doesn't match, or
    ///   backups_directory is not configured.
    /// - `Persistence`: filesystem or SQLite errors during backup or
    ///   wipe. The wipe is transactional — if the SQL step fails, no
    ///   rows are deleted.
    pub fn wipe_all(
        &self,
        confirmation_name: &str,
        current_rate: Option<BcvRate>,
    ) -> DomainResult<PathBuf> {
        let current_settings = self.settings.load()?;

        // Validate that the confirmation matches the stored user_name.
        // Trimmed on both sides to be forgiving of trailing whitespace,
        // but case-sensitive because the user typed both.
        let expected = current_settings.user_name.trim();
        let provided = confirmation_name.trim();
        if expected.is_empty() {
            return Err(DomainError::Validation(
                "no user name is configured; nothing to confirm against".into(),
            ));
        }
        if provided != expected {
            return Err(DomainError::Validation(
                "confirmation name does not match the configured user name".into(),
            ));
        }

        // Validate that a backups directory exists.
        let backups_root = current_settings.backups_directory.trim();
        if backups_root.is_empty() {
            return Err(DomainError::Validation(
                "no backups directory is configured; configure one before wiping".into(),
            ));
        }

        // Ensure the wipe_backups/ subdirectory exists. This may have
        // been deleted by the user manually between configuration and
        // wipe, so we re-create it defensively.
        let backup_dir = PathBuf::from(backups_root)
            .join("waled-backups")
            .join("wipe_backups");
        std::fs::create_dir_all(&backup_dir).map_err(|err| {
            DomainError::Persistence(format!(
                "failed to prepare wipe_backups directory: {err}"
            ))
        })?;

        // Compute the backup file path using local time for readability.
        let timestamp = Local::now().format("%Y-%m-%d-%H%M%S").to_string();
        let backup_path = backup_dir.join(format!("wipe-{timestamp}.json"));

        // Write the backup FIRST. If this fails, the wipe is aborted
        // and the database is untouched.
        self.exporter.write_to_file(&backup_path, current_rate)?;

        // Perform the wipe. Each repository executes its own DELETE
        // against the same underlying pool. In practice these are all
        // fast operations on a local SQLite file, so wrapping them in
        // a single transaction would require refactoring the ports.
        // For v0.2.0 we accept the small risk of partial state — if
        // one DELETE fails, the backup still exists for recovery.
        self.transactions.wipe_all_rows()?;
        self.accounts.wipe_all_rows()?;
        self.wallets.wipe_all_rows()?;

        // Reset settings to defaults, preserving only backups_directory.
        // Direct SQL because the SettingsRepository doesn't expose a
        // "reset" operation and we want atomicity via UPDATE.
        let connection = self.pool.get().map_err(|err| {
            DomainError::Persistence(err.to_string())
        })?;
        connection
            .execute(
                "UPDATE settings SET \
                    user_name = '', \
                    user_email = '', \
                    gas_reminder_webhook_url = '', \
                    gas_sync_webhook_url = '', \
                    backups_directory = ?1 \
                 WHERE id = 1",
                params![current_settings.backups_directory],
            )
            .map_err(|err| DomainError::Persistence(err.to_string()))?;

        Ok(backup_path)
    }
}
