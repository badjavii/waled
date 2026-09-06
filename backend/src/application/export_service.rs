//! Export the entire database to a JSON snapshot.

use std::sync::Arc;

use chrono::Utc;
use serde::Serialize;
use std::path::{Path, PathBuf};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, BcvRate, Settings, Transaction, Wallet};
use crate::domain::ports::{
    AccountRepository, SettingsRepository, TransactionRepository, WalletRepository,
};

#[derive(Debug, Serialize)]
pub struct DatabaseSnapshot {
    pub exported_at: chrono::DateTime<Utc>,
    pub settings: Settings,
    /// Session BCV rate at export time. Not persisted; included only as
    /// a reference of what rate was live when the backup was taken.
    pub bcv_rate: Option<BcvRate>,
    pub wallets: Vec<Wallet>,
    pub accounts: Vec<Account>,
    pub transactions: Vec<Transaction>,
}

pub struct ExportService {
    settings: Arc<dyn SettingsRepository>,
    wallets: Arc<dyn WalletRepository>,
    accounts: Arc<dyn AccountRepository>,
    transactions: Arc<dyn TransactionRepository>,
}

impl ExportService {
    #[must_use]
    pub fn new(
        settings: Arc<dyn SettingsRepository>,
        wallets: Arc<dyn WalletRepository>,
        accounts: Arc<dyn AccountRepository>,
        transactions: Arc<dyn TransactionRepository>,
    ) -> Self {
        Self { settings, wallets, accounts, transactions }
    }

    pub fn snapshot(&self, current_rate: Option<BcvRate>) -> DomainResult<DatabaseSnapshot> {
        Ok(DatabaseSnapshot {
            exported_at: Utc::now(),
            settings: self.settings.load()?,
            bcv_rate: current_rate,
            wallets: self.wallets.list_all()?,
            accounts: self.accounts.list()?,
            transactions: self.transactions.list()?,
        })
    }

    pub fn write_to_file(
        &self,
        destination: &Path,
        current_rate: Option<BcvRate>,
    ) -> DomainResult<PathBuf> {
        let snapshot = self.snapshot(current_rate)?;
        let json = serde_json::to_string_pretty(&snapshot)
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
        std::fs::write(destination, json)
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
        Ok(destination.to_path_buf())
    }
}
