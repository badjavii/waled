//! Import a Waled JSON snapshot into the local database.
//!
//! The workflow (spec §4 "Importar respaldo"):
//!
//!   1. Read and parse the JSON file. Reject if the shape doesn't match
//!      [`DatabaseSnapshot`] or if `schema_version` is not exactly the
//!      current [`EXPECTED_SCHEMA_VERSION`].
//!   2. Refuse to proceed if `backups_directory` is not configured —
//!      the app cannot write a pre-import backup without a target.
//!   3. Write a full backup of the CURRENT state to
//!      `{backups_directory}/waled-backups/import_backups/import-<ts>.json`.
//!      If this step fails, the import aborts before touching the DB.
//!   4. Wipe all wallets, accounts and transactions.
//!   5. Insert every row from the JSON in order (wallets → accounts →
//!      transactions). Accounts and transactions can safely reference
//!      wallets by the time they are inserted.
//!   6. Overwrite `settings` with the snapshot's settings, preserving
//!      the current `backups_directory` (we don't want the import to
//!      steal a directory the user configured on this machine).

use std::path::{Path, PathBuf};
use std::sync::Arc;

use chrono::Local;
use rusqlite::params;

use crate::application::export_service::{
    DatabaseSnapshot, ExportService, EXPECTED_SCHEMA_VERSION,
};
use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::BcvRate;
use crate::domain::ports::{
    AccountRepository, SettingsRepository, TransactionRepository, WalletRepository,
};
use crate::infrastructure::db::connection::SqlitePool;

/// Outcome surfaced back to the UI so the toast can be specific.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportSummary {
    pub backup_path: PathBuf,
    pub imported_wallets: usize,
    pub imported_accounts: usize,
    pub imported_transactions: usize,
}

pub struct ImportService {
    pool: SqlitePool,
    exporter: Arc<ExportService>,
    settings: Arc<dyn SettingsRepository>,
    wallets: Arc<dyn WalletRepository>,
    accounts: Arc<dyn AccountRepository>,
    transactions: Arc<dyn TransactionRepository>,
}

impl ImportService {
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

    pub fn import_from_file(
        &self,
        source: &Path,
        current_rate: Option<BcvRate>,
    ) -> DomainResult<ImportSummary> {
        // 1. Read and parse the file.
        let raw = std::fs::read_to_string(source).map_err(|err| {
            DomainError::Persistence(format!(
                "failed to read import file {}: {}",
                source.display(),
                err
            ))
        })?;

        let snapshot: DatabaseSnapshot = serde_json::from_str(&raw).map_err(|err| {
            DomainError::Validation(format!(
                "invalid backup file: {} (expected a Waled JSON snapshot)",
                err
            ))
        })?;

        // 2. Version guard.
        if snapshot.schema_version != EXPECTED_SCHEMA_VERSION {
            return Err(DomainError::Validation(format!(
                "unsupported backup version: got {}, expected {}",
                snapshot.schema_version, EXPECTED_SCHEMA_VERSION
            )));
        }

        // 3. Precondition: backups_directory must be configured so we
        //    can write the pre-import backup.
        let current_settings = self.settings.load()?;
        let backups_root = current_settings.backups_directory.trim();
        if backups_root.is_empty() {
            return Err(DomainError::Validation(
                "no backups directory is configured; configure one before importing".into(),
            ));
        }

        let import_dir = PathBuf::from(backups_root)
            .join("waled-backups")
            .join("import_backups");
        std::fs::create_dir_all(&import_dir).map_err(|err| {
            DomainError::Persistence(format!(
                "failed to prepare import_backups directory: {err}"
            ))
        })?;

        let timestamp = Local::now().format("%Y-%m-%d-%H%M%S").to_string();
        let backup_path = import_dir.join(format!("import-{timestamp}.json"));

        // 4. Write pre-import backup FIRST. If this fails, abort.
        self.exporter.write_to_file(&backup_path, current_rate)?;

        // 5. Wipe existing state (order doesn't matter here — no FKs
        //    are enforced across tables in the current schema, but
        //    conceptually transactions reference accounts and wallets).
        self.transactions.wipe_all_rows()?;
        self.accounts.wipe_all_rows()?;
        self.wallets.wipe_all_rows()?;

        // 6. Insert rows from the snapshot.
        let imported_wallets = snapshot.wallets.len();
        let imported_accounts = snapshot.accounts.len();
        let imported_transactions = snapshot.transactions.len();

        for wallet in &snapshot.wallets {
            self.wallets.create(wallet)?;
        }
        for account in &snapshot.accounts {
            self.accounts.create(account)?;
        }
        for transaction in &snapshot.transactions {
            self.transactions.create(transaction)?;
        }

        // 7. Overwrite settings, preserving backups_directory.
        //    Direct SQL because SettingsRepository doesn't expose a
        //    "replace preserving X" primitive.
        let connection = self.pool.get().map_err(|err| {
            DomainError::Persistence(err.to_string())
        })?;
        connection
            .execute(
                "UPDATE settings SET \
                    user_name = ?1, \
                    user_email = ?2, \
                    gas_reminder_webhook_url = ?3, \
                    gas_sync_webhook_url = ?4, \
                    backups_directory = ?5 \
                 WHERE id = 1",
                params![
                    snapshot.settings.user_name,
                    snapshot.settings.user_email,
                    snapshot.settings.gas_reminder_webhook_url,
                    snapshot.settings.gas_sync_webhook_url,
                    current_settings.backups_directory, // preserve local
                ],
            )
            .map_err(|err| DomainError::Persistence(err.to_string()))?;

        Ok(ImportSummary {
            backup_path,
            imported_wallets,
            imported_accounts,
            imported_transactions,
        })
    }
}
