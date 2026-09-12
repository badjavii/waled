//! Ports (traits) that adapters must implement.
//!
//! These traits allow the application layer to depend only on abstractions,
//! keeping the domain free of infrastructure details.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

use crate::domain::errors::DomainResult;
use crate::domain::models::{Account, BcvRate, Reminder, Settings, Transaction, Wallet};

/// Persistence port for wallets.
pub trait WalletRepository: Send + Sync {
    /// List only active (non-archived) wallets.
    fn list_active(&self) -> DomainResult<Vec<Wallet>>;
    /// List all wallets including archived. Used for exports and for
    /// resolving wallet references from historical transactions.
    fn list_all(&self) -> DomainResult<Vec<Wallet>>;
    fn get(&self, id: &str) -> DomainResult<Wallet>;
    fn create(&self, wallet: &Wallet) -> DomainResult<()>;
    fn update(&self, wallet: &Wallet) -> DomainResult<()>;
    /// Soft-delete: sets `archived_at` to now. The row is preserved.
    fn archive(&self, id: &str) -> DomainResult<()>;
    fn count(&self) -> DomainResult<i64>;
    /// Delete all wallets permanently. Used exclusively by the wipe
    /// operation. Do NOT call outside a wipe transaction.
    fn wipe_all_rows(&self) -> DomainResult<()>;
}

/// Persistence port for accounts.
pub trait AccountRepository: Send + Sync {
    /// List only active (non-archived) accounts. Used by UI listings and
    /// by the transaction form's account selector.
    fn list_active(&self) -> DomainResult<Vec<Account>>;
    /// List all accounts including archived. Used for exports and for
    /// resolving account references from historical transactions and
    /// monthly aggregates.
    fn list_all(&self) -> DomainResult<Vec<Account>>;
    /// List only active periodic accounts. Used by the reminder service.
    fn list_active_periodic(&self) -> DomainResult<Vec<Account>>;
    fn get(&self, id: &str) -> DomainResult<Account>;
    fn create(&self, account: &Account) -> DomainResult<()>;
    fn update(&self, account: &Account) -> DomainResult<()>;
    /// Soft-delete: sets `archived_at` to now. The row is preserved.
    fn archive(&self, id: &str) -> DomainResult<()>;
    fn count(&self) -> DomainResult<i64>;
    /// Delete all accounts permanently. Used exclusively by the wipe
    /// operation. Do NOT call outside a wipe transaction.
    fn wipe_all_rows(&self) -> DomainResult<()>;
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
    /// Delete all transactions permanently. Used exclusively by the
    /// wipe operation. Do NOT call outside a wipe transaction.
    fn wipe_all_rows(&self) -> DomainResult<()>;
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

/// Kind of notification being sent to the reminder webhook.
///
/// - `Manual`: dispatched from the "Enviar ahora" button in the Reminders screen.
/// - `Scheduled`: reserved for future automated triggers (see draft.md §3.8).
/// - `Ping`: connectivity check from the Settings modal. GAS should
///   receive it and respond 2xx without sending any email.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReminderNotificationKind {
    Manual,
    Scheduled,
    Ping,
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

/// Outbound port for synchronizing periodic account state with an
/// external service (Google Apps Script). All methods are strict online:
/// they must either propagate successfully or return an error that
/// prevents local state mutation.
///
/// When the configured URL is empty, callers should skip invocation
/// entirely (see `AccountService`). This trait's contract assumes the
/// URL is populated.
#[async_trait::async_trait]
pub trait SyncPort: Send + Sync {
    /// Notify GAS that a new periodic account was created.
    async fn notify_account_created(
        &self,
        webhook_url: &str,
        payload: &SyncAccountPayload,
    ) -> DomainResult<()>;

    /// Notify GAS that a periodic account was updated.
    async fn notify_account_updated(
        &self,
        webhook_url: &str,
        payload: &SyncAccountPayload,
    ) -> DomainResult<()>;

    /// Notify GAS that a periodic account was archived (soft-deleted).
    async fn notify_account_archived(
        &self,
        webhook_url: &str,
        account_id: &str,
    ) -> DomainResult<()>;

    /// Send a lightweight ping to verify connectivity. Used by the
    /// "Probar" button in the Settings modal.
    async fn ping(&self, webhook_url: &str) -> DomainResult<()>;

    /// Notify GAS that a periodic account has been paid within the
    /// current calendar month. Suspends further reminder emails for
    /// that account until the next month's reset.
    async fn notify_payment_marked(
        &self,
        webhook_url: &str,
        account_id: &str,
        month: &str,
    ) -> DomainResult<()>;
}

/// Serializable snapshot of a periodic account, sent to GAS during
/// create and update events. Mirrors the fields GAS needs to evaluate
/// reminders — mutability, notification preferences, and monthly window.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncAccountPayload {
    pub id: String,
    pub concept: String,
    pub start_day: i64,
    pub due_day: i64,
    pub notify: bool,
}
