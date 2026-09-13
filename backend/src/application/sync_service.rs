//! Application-level orchestration of the sync webhook.

use std::sync::Arc;

use crate::domain::errors::DomainResult;
use crate::domain::ports::{
    AccountRepository, FullResyncAccount, FullResyncPayload, SettingsRepository,
    SyncPort, TransactionRepository,
};

pub struct SyncService {
    settings: Arc<dyn SettingsRepository>,
    accounts: Arc<dyn AccountRepository>,
    transactions: Arc<dyn TransactionRepository>,
    sync: Arc<dyn SyncPort>,
}

impl SyncService {
    #[must_use]
    pub fn new(
        settings: Arc<dyn SettingsRepository>,
        accounts: Arc<dyn AccountRepository>,
        transactions: Arc<dyn TransactionRepository>,
        sync: Arc<dyn SyncPort>,
    ) -> Self {
        Self { settings, accounts, transactions, sync }
    }

    /// Push the full state of active periodic accounts to GAS. Returns
    /// early with `Ok(())` if the sync webhook URL is empty (nothing to
    /// do — the user is running in local-only mode).
    ///
    /// # Errors
    ///
    /// Returns `NetworkRequired` if the webhook is configured but the
    /// call fails, following the same strict-online semantics as other
    /// sync operations.
    pub async fn full_resync(&self) -> DomainResult<()> {
        let settings = self.settings.load()?;
        let url = settings.gas_sync_webhook_url.trim();
        if url.is_empty() {
            return Ok(());
        }

        let today = chrono::Utc::now().date_naive();
        let (month_start, month_end) = month_bounds(today);

        let mut accounts_payload = Vec::new();
        for account in self.accounts.list_active_periodic()? {
            let start_day = account.start_day.unwrap_or(1);
            let due_day = account.due_day.unwrap_or(1);

            let is_paid = self
                .transactions
                .list_by_account(&account.id)?
                .into_iter()
                .any(|tx| tx.payment_date >= month_start && tx.payment_date <= month_end);

            accounts_payload.push(FullResyncAccount {
                id: account.id,
                concept: account.name,
                start_day,
                due_day,
                notify: account.notify,
                is_paid,
            });
        }

        let payload = FullResyncPayload {
            accounts: accounts_payload,
        };

        self.sync.notify_full_resync(url, &payload).await
    }
}

fn month_bounds(anchor: chrono::NaiveDate) -> (chrono::NaiveDate, chrono::NaiveDate) {
    use chrono::{Datelike, Duration};
    let year = anchor.year();
    let month = anchor.month();
    let first = chrono::NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let (next_year, next_month) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };
    let first_next = chrono::NaiveDate::from_ymd_opt(next_year, next_month, 1).unwrap();
    let last = first_next - Duration::days(1);
    (first, last)
}
