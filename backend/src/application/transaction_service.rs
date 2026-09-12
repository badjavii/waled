//! Transaction lifecycle: creating, updating, deleting expense entries.
//!
//! Transactions freeze the BCV rate at payment time to preserve
//! historical accuracy. The USD equivalent shown anywhere in the app
//! for a past transaction is always derived from that frozen rate.
//!
//! v0.2.0 introduces sync-first behavior for the first payment of the
//! month on an active periodic account: the "mark_paid" event is sent
//! to GAS before persisting locally, per spec §3.6 (STRICT ONLINE).

use std::sync::Arc;

use chrono::{Datelike, Duration, NaiveDate, Utc};
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, Transaction};
use crate::domain::ports::{
    AccountRepository, SettingsRepository, SyncPort, TransactionRepository, WalletRepository,
};

pub struct TransactionService {
    repository: Arc<dyn TransactionRepository>,
    accounts: Arc<dyn AccountRepository>,
    wallets: Arc<dyn WalletRepository>,
    settings: Arc<dyn SettingsRepository>,
    sync: Arc<dyn SyncPort>,
}

impl TransactionService {
    #[must_use]
    pub fn new(
        repository: Arc<dyn TransactionRepository>,
        accounts: Arc<dyn AccountRepository>,
        wallets: Arc<dyn WalletRepository>,
        settings: Arc<dyn SettingsRepository>,
        sync: Arc<dyn SyncPort>,
    ) -> Self {
        Self {
            repository,
            accounts,
            wallets,
            settings,
            sync,
        }
    }

    pub fn list(&self) -> DomainResult<Vec<Transaction>> {
        self.repository.list()
    }

    pub fn list_by_account(&self, account_id: &str) -> DomainResult<Vec<Transaction>> {
        self.repository.list_by_account(account_id)
    }

    pub fn get(&self, id: &str) -> DomainResult<Transaction> {
        self.repository.get(id)
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn create(
        &self,
        account_id: String,
        wallet_id: String,
        ves_amount: f64,
        payment_date: NaiveDate,
        description: String,
        payment_reference: Option<String>,
        bcv_rate_at_payment: f64,
    ) -> DomainResult<Transaction> {
        if ves_amount <= 0.0 {
            return Err(DomainError::Validation(
                "ves_amount must be positive".into(),
            ));
        }

        let account = self.accounts.get(&account_id)?;
        let wallet = self.wallets.get(&wallet_id)?;

        if account.archived_at.is_some() {
            return Err(DomainError::Validation(format!(
                "account {account_id} is archived and cannot receive new transactions"
            )));
        }
        if wallet.archived_at.is_some() {
            return Err(DomainError::Validation(format!(
                "wallet {wallet_id} is archived and cannot be used for new transactions"
            )));
        }

        if bcv_rate_at_payment <= 0.0 {
            return Err(DomainError::Validation(
                "bcv_rate_at_payment must be positive".into(),
            ));
        }

        let transaction = Transaction {
            id: format!("t_{}", Uuid::new_v4().simple()),
            account_id: account.id.clone(),
            wallet_id: wallet.id.clone(),
            ves_amount,
            payment_date,
            created_at: Utc::now(),
            description,
            payment_reference: normalize_optional_string(payment_reference),
            bcv_rate_at_payment,
        };

        // STRICT ONLINE (spec §3.6): if this is the first transaction of
        // the current calendar month on an active periodic account,
        // dispatch mark_paid to GAS before persisting. Failing the sync
        // rejects the whole operation atomically.
        if self.should_mark_paid(&account, payment_date)? {
            if let Some(url) = self.sync_url_if_configured()? {
                let month = format_month(payment_date);
                self.sync
                    .notify_payment_marked(&url, &account.id, &month)
                    .await?;
            }
        }

        self.repository.create(&transaction)?;
        Ok(transaction)
    }

    pub fn update(&self, mut transaction: Transaction) -> DomainResult<Transaction> {
        if transaction.ves_amount <= 0.0 {
            return Err(DomainError::Validation(
                "ves_amount must be positive".into(),
            ));
        }
        if transaction.bcv_rate_at_payment <= 0.0 {
            return Err(DomainError::Validation(
                "bcv_rate_at_payment must be positive".into(),
            ));
        }
        transaction.payment_reference = normalize_optional_string(transaction.payment_reference);
        self.repository.update(&transaction)?;
        Ok(transaction)
    }

    pub fn delete(&self, id: &str) -> DomainResult<()> {
        self.repository.delete(id)
    }

    /// Whether this transaction should trigger a `mark_paid` sync event.
    ///
    /// Returns `true` only when all conditions hold:
    ///   1. The account is periodic (and active — the caller already
    ///      rejected archived accounts before reaching here).
    ///   2. `payment_date` falls in the current calendar month.
    ///   3. There is no prior transaction for this account in the same
    ///      calendar month — i.e. this is the first payment of the cycle.
    ///
    /// Registering a past-month payment or a second payment in the same
    /// month never triggers sync, per Entrega 4b.3 decisions.
    fn should_mark_paid(
        &self,
        account: &Account,
        payment_date: NaiveDate,
    ) -> DomainResult<bool> {
        if !account.is_periodic {
            return Ok(false);
        }

        let today = Utc::now().date_naive();
        if payment_date.year() != today.year() || payment_date.month() != today.month() {
            return Ok(false);
        }

        let (month_start, month_end) = month_bounds(today);
        let existing = self
            .repository
            .list_by_account(&account.id)?
            .into_iter()
            .any(|tx| tx.payment_date >= month_start && tx.payment_date <= month_end);

        Ok(!existing)
    }

    fn sync_url_if_configured(&self) -> DomainResult<Option<String>> {
        let settings = self.settings.load()?;
        let trimmed = settings.gas_sync_webhook_url.trim();
        if trimmed.is_empty() {
            Ok(None)
        } else {
            Ok(Some(trimmed.to_string()))
        }
    }
}

fn days_in_month(anchor: NaiveDate) -> u32 {
    let year = anchor.year();
    let month = anchor.month();
    let (next_year, next_month) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };
    let first_next = NaiveDate::from_ymd_opt(next_year, next_month, 1).unwrap();
    let last_this = first_next - Duration::days(1);
    last_this.day()
}

fn month_bounds(anchor: NaiveDate) -> (NaiveDate, NaiveDate) {
    let year = anchor.year();
    let month = anchor.month();
    let first = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let last = NaiveDate::from_ymd_opt(year, month, days_in_month(anchor)).unwrap();
    (first, last)
}

fn format_month(date: NaiveDate) -> String {
    format!("{:04}-{:02}", date.year(), date.month())
}

/// Convert an optional string to `None` if it's absent, empty, or contains
/// only whitespace. Otherwise return the trimmed value wrapped in `Some`.
fn normalize_optional_string(value: Option<String>) -> Option<String> {
    value
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
