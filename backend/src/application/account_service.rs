//! Account CRUD use cases.

use std::sync::Arc;

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, AccountType};
use crate::domain::ports::AccountRepository;

/// Default `start_day` when the user creates a periodic account without
/// specifying one — as defined in spec §1.3.
const DEFAULT_START_DAY: i64 = 1;

pub struct AccountService {
    repository: Arc<dyn AccountRepository>,
}

impl AccountService {
    #[must_use]
    pub fn new(repository: Arc<dyn AccountRepository>) -> Self {
        Self { repository }
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

    pub fn create(
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
                DomainError::Validation(
                    "periodic accounts require a due_day (1-31)".into(),
                )
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
        self.repository.create(&account)?;
        Ok(account)
    }

    pub fn update(&self, mut account: Account) -> DomainResult<Account> {
        if account.name.trim().is_empty() {
            return Err(DomainError::Validation("account name is required".into()));
        }

        if account.is_periodic {
            let resolved_start = account.start_day.unwrap_or(DEFAULT_START_DAY);
            let resolved_due = account.due_day.ok_or_else(|| {
                DomainError::Validation(
                    "periodic accounts require a due_day (1-31)".into(),
                )
            })?;
            Self::validate_window(resolved_start, resolved_due)?;
            account.start_day = Some(resolved_start);
            account.due_day = Some(resolved_due);
        } else {
            account.start_day = None;
            account.due_day = None;
            account.notify = false;
        }

        self.repository.update(&account)?;
        Ok(account)
    }

    pub fn archive(&self, id: &str) -> DomainResult<()> {
        self.repository.archive(id)
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
