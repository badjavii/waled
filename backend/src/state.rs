//! Composition root.

use std::path::Path;
use std::sync::Arc;

use crate::application::account_service::AccountService;
use crate::application::export_service::ExportService;
use crate::application::reminder_service::ReminderService;
use crate::application::settings_service::SettingsService;
use crate::application::transaction_service::TransactionService;
use crate::application::wallet_service::WalletService;
use crate::domain::errors::DomainResult;
use crate::domain::ports::BcvRateProvider;
use crate::infrastructure::bcv::dolarapi_client::DolarApiClient;
use crate::infrastructure::db::account_repository::SqliteAccountRepository;
use crate::infrastructure::db::connection::{build_pool, SqlitePool};
use crate::infrastructure::db::settings_repository::SqliteSettingsRepository;
use crate::infrastructure::db::transaction_repository::SqliteTransactionRepository;
use crate::infrastructure::db::wallet_repository::SqliteWalletRepository;
use crate::infrastructure::db::{migrations, seed};
use crate::infrastructure::notifier::google_script_notifier::GoogleScriptNotifier;
use crate::infrastructure::scheduler::bcv_rate_scheduler::BcvRateState;

/// Bag of services shared with every Tauri command via `State<AppState>`.
#[derive(Clone)]
pub struct AppState {
    pub wallets: Arc<WalletService>,
    pub accounts: Arc<AccountService>,
    pub transactions: Arc<TransactionService>,
    pub settings: Arc<SettingsService>,
    pub reminders: Arc<ReminderService>,
    pub exporter: Arc<ExportService>,
    pub bcv_state: BcvRateState,
    pub bcv_provider: Arc<dyn BcvRateProvider>,
    pub pool: SqlitePool,
}

impl AppState {
    pub fn bootstrap(database_path: &Path) -> DomainResult<Self> {
        let pool = build_pool(database_path)?;
        migrations::run(&pool)?;
        seed::run(&pool)?;

        let wallet_repository = Arc::new(SqliteWalletRepository::new(pool.clone()));
        let account_repository = Arc::new(SqliteAccountRepository::new(pool.clone()));
        let transaction_repository = Arc::new(SqliteTransactionRepository::new(pool.clone()));
        let settings_repository = Arc::new(SqliteSettingsRepository::new(pool.clone()));

        let notifier = Arc::new(GoogleScriptNotifier::new()?);
        let bcv_provider: Arc<dyn BcvRateProvider> = Arc::new(DolarApiClient::new()?);
        let bcv_state = BcvRateState::new();

        let wallets = Arc::new(WalletService::new(wallet_repository.clone()));
        let accounts = Arc::new(AccountService::new(account_repository.clone()));
        let transactions = Arc::new(TransactionService::new(
            transaction_repository.clone(),
            account_repository.clone(),
            wallet_repository.clone(),
        ));
        let settings = Arc::new(SettingsService::new(settings_repository.clone()));
        let reminders = Arc::new(ReminderService::new(
            account_repository.clone(),
            transaction_repository.clone(),
            settings_repository.clone(),
            notifier,
        ));
        let exporter = Arc::new(ExportService::new(
            settings_repository,
            wallet_repository,
            account_repository,
            transaction_repository,
        ));

        Ok(Self {
            wallets,
            accounts,
            transactions,
            settings,
            reminders,
            exporter,
            bcv_state,
            bcv_provider,
            pool,
        })
    }
}
