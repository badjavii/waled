//! Ports (traits) that adapters must implement.
//!
//! These traits allow the application layer to depend only on abstractions,
//! keeping the domain free of infrastructure details.

use chrono::NaiveDate;

use crate::domain::errors::DomainResult;
use crate::domain::models::{Account, BcvRate, Reminder, Settings, Transaction, Wallet};

/// Persistence port for wallets.
pub trait WalletRepository: Send + Sync {
    fn list(&self) -> DomainResult<Vec<Wallet>>;
    fn get(&self, id: &str) -> DomainResult<Wallet>;
    fn create(&self, wallet: &Wallet) -> DomainResult<()>;
    fn update(&self, wallet: &Wallet) -> DomainResult<()>;
    fn delete(&self, id: &str) -> DomainResult<()>;
    fn count(&self) -> DomainResult<i64>;
}

/// Persistence port for accounts.
pub trait AccountRepository: Send + Sync {
    fn list(&self) -> DomainResult<Vec<Account>>;
    fn list_periodic(&self) -> DomainResult<Vec<Account>>;
    fn get(&self, id: &str) -> DomainResult<Account>;
    fn create(&self, account: &Account) -> DomainResult<()>;
    fn update(&self, account: &Account) -> DomainResult<()>;
    fn delete(&self, id: &str) -> DomainResult<()>;
    fn count(&self) -> DomainResult<i64>;
}

/// Persistence port for transactions.
pub trait TransactionRepository: Send + Sync {
    fn list(&self) -> DomainResult<Vec<Transaction>>;
    fn list_between(&self, from: NaiveDate, to: NaiveDate) -> DomainResult<Vec<Transaction>>;
    fn list_by_account(&self, account_id: &str) -> DomainResult<Vec<Transaction>>;
    fn last_by_account(&self, account_id: &str) -> DomainResult<Option<Transaction>>;
    fn get(&self, id: &str) -> DomainResult<Transaction>;
    fn create(&self, transaction: &Transaction) -> DomainResult<()>;
    fn update(&self, transaction: &Transaction) -> DomainResult<()>;
    fn delete(&self, id: &str) -> DomainResult<()>;
}

/// Persistence port for the single-row settings record.
pub trait SettingsRepository: Send + Sync {
    fn load(&self) -> DomainResult<Settings>;
    fn save(&self, settings: &Settings) -> DomainResult<()>;
}

/// Outbound port that fetches the current official BCV rate from a
/// remote source. Implementations must return a network error rather
/// than a default when the upstream is unreachable, so the caller can
/// surface an explicit offline state.
#[async_trait::async_trait]
pub trait BcvRateProvider: Send + Sync {
    async fn fetch_current(&self) -> DomainResult<BcvRate>;
}

/// Payload dispatched to the external notifier for the reminder email.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ReminderNotificationPayload {
    pub kind: ReminderNotificationKind,
    pub user_name: String,
    pub user_email: String,
    pub generated_at: chrono::DateTime<chrono::Utc>,
    pub reminders: Vec<Reminder>,
    pub total_ves: f64,
}

/// Categorises which trigger produced a notification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ReminderNotificationKind {
    /// Weekly digest of the next 21 days.
    WeeklyThreeWeekWindow,
    /// Monthly summary sent on the first of the month.
    MonthlySummary,
    /// Manual trigger from the UI.
    Manual,
}

/// Outbound port for reminder email delivery.
#[async_trait::async_trait]
pub trait NotificationSender: Send + Sync {
    /// Send a reminder digest to the configured webhook.
    ///
    /// # Errors
    ///
    /// Returns [`DomainError::Notification`] when the request cannot be
    /// completed or the endpoint replies with a non-success status.
    async fn send_reminder(
        &self,
        webhook_url: &str,
        payload: &ReminderNotificationPayload,
    ) -> DomainResult<()>;
}
