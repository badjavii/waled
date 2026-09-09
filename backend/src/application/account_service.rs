//! Account CRUD use cases with strict-online sync propagation.
//!
//! When the sync webhook URL is configured, mutations on periodic
//! accounts must succeed on the remote side before being persisted
//! locally (see spec §1.3 and §3.6). When the URL is empty, mutations
//! proceed local-only for a friction-free offline experience.

use std::sync::Arc;

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, AccountType};
use crate::domain::ports::{AccountRepository, SettingsRepository, SyncAccountPayload, SyncPort};

const DEFAULT_START_DAY: i64 = 1;

pub struct AccountService {
    repository: Arc<dyn AccountRepository>,
    settings: Arc<dyn SettingsRepository>,
    sync: Arc<dyn SyncPort>,
}

impl AccountService {
    #[must_use]
    pub fn new(
        repository: Arc<dyn AccountRepository>,
        settings: Arc<dyn SettingsRepository>,
        sync: Arc<dyn SyncPort>,
    ) -> Self {
        Self { repository, settings, sync }
    }

    pub fn list_active(&self) -> DomainResult<Vec<Account>> {
        self.repository.list_active()
    }

    pub fn list_all(&self) -> DomainResult<Vec<Account>> {
        self.repository.list_all()
    }

    pub fn get(&self, id: &str) -> DomainResult<Account> {
        self.repository.get(id)
    }

    /// Create a new account. Periodic accounts are synced to GAS first,
    /// and only persisted locally if the remote acknowledges (or if the
    /// sync webhook is not configured).
    pub async fn create(
        &self,
        name: String,
        description: String,
        account_type: AccountType,
        is_periodic: bool,
        start_day: Option<i64>,
        due_day: Option<i64>,
        notify: bool,
    ) -> DomainResult<Account> {
        if name.trim().is_empty() {
            return Err(DomainError::Validation("account name is required".into()));
        }

        let (final_start, final_due) = if is_periodic {
            let resolved_start = start_day.unwrap_or(DEFAULT_START_DAY);
            let resolved_due = due_day.ok_or_else(|| {
                DomainError::Validation("periodic accounts require a due_day (1-31)".into())
            })?;
            Self::validate_window(resolved_start, resolved_due)?;
            (Some(resolved_start), Some(resolved_due))
        } else {
            (None, None)
        };

        let account = Account {
            id: format!("a_{}", Uuid::new_v4().simple()),
            name,
            description,
            account_type,
            is_periodic,
            start_day: final_start,
            due_day: final_due,
            notify: if is_periodic { notify } else { false },
            archived_at: None,
        };

        // Sync-first: for periodic accounts with a configured sync webhook,
        // GAS must acknowledge before we persist local state.
        if account.is_periodic {
            if let Some(url) = self.sync_url_if_configured()? {
                let payload = Self::payload_from_account(&account);
                self.sync.notify_account_created(&url, &payload).await?;
            }
        }

        self.repository.create(&account)?;
        Ok(account)
    }

    pub async fn update(&self, mut account: Account) -> DomainResult<Account> {
        if account.name.trim().is_empty() {
            return Err(DomainError::Validation("account name is required".into()));
        }

        if account.is_periodic {
            let resolved_start = account.start_day.unwrap_or(DEFAULT_START_DAY);
            let resolved_due = account.due_day.ok_or_else(|| {
                DomainError::Validation("periodic accounts require a due_day (1-31)".into())
            })?;
            Self::validate_window(resolved_start, resolved_due)?;
            account.start_day = Some(resolved_start);
            account.due_day = Some(resolved_due);
        } else {
            account.start_day = None;
            account.due_day = None;
            account.notify = false;
        }

        if account.is_periodic {
            if let Some(url) = self.sync_url_if_configured()? {
                let payload = Self::payload_from_account(&account);
                self.sync.notify_account_updated(&url, &payload).await?;
            }
        }

        self.repository.update(&account)?;
        Ok(account)
    }

    /// Archive an account. If the account is periodic and the sync webhook
    /// is configured, GAS is notified first so it stops sending reminders
    /// even before local state is updated.
    pub async fn archive(&self, id: &str) -> DomainResult<()> {
        let existing = self.repository.get(id)?;
        if existing.archived_at.is_some() {
            return Err(DomainError::NotFound(format!(
                "account {id} is already archived"
            )));
        }

        if existing.is_periodic {
            if let Some(url) = self.sync_url_if_configured()? {
                self.sync.notify_account_archived(&url, id).await?;
            }
        }

        self.repository.archive(id)
    }

    /// Return the sync webhook URL only if it's configured (non-empty).
    /// A `None` result means the caller should skip sync entirely.
    fn sync_url_if_configured(&self) -> DomainResult<Option<String>> {
        let settings = self.settings.load()?;
        let trimmed = settings.gas_sync_webhook_url.trim();
        if trimmed.is_empty() {
            Ok(None)
        } else {
            Ok(Some(trimmed.to_string()))
        }
    }

    fn payload_from_account(account: &Account) -> SyncAccountPayload {
        SyncAccountPayload {
            id: account.id.clone(),
            concept: account.name.clone(),
            start_day: account.start_day.unwrap_or(DEFAULT_START_DAY),
            due_day: account.due_day.unwrap_or(0),
            notify: account.notify,
        }
    }

    fn validate_window(start_day: i64, due_day: i64) -> DomainResult<()> {
        if !(1..=31).contains(&start_day) {
            return Err(DomainError::Validation(
                "start_day must be between 1 and 31".into(),
            ));
        }
        if !(1..=31).contains(&due_day) {
            return Err(DomainError::Validation(
                "due_day must be between 1 and 31".into(),
            ));
        }
        if start_day > due_day {
            return Err(DomainError::Validation(
                "start_day must be less than or equal to due_day (cross-month windows are not allowed in v0.2.0)".into(),
            ));
        }
        Ok(())
    }
}
