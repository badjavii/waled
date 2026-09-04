//! Account CRUD use cases.

use std::sync::Arc;

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, AccountType};
use crate::domain::ports::AccountRepository;

pub struct AccountService {
    repository: Arc<dyn AccountRepository>,
}

impl AccountService {
    #[must_use]
    pub fn new(repository: Arc<dyn AccountRepository>) -> Self {
        Self { repository }
    }

    pub fn list(&self) -> DomainResult<Vec<Account>> {
        self.repository.list()
    }

    pub fn get(&self, id: &str) -> DomainResult<Account> {
        self.repository.get(id)
    }

    /// Create a new account.
    ///
    /// # Errors
    ///
    /// Returns [`DomainError::Validation`] when the name is empty or when
    /// `is_periodic` is true but `periodicity_days` is missing or non-positive.
    pub fn create(
        &self,
        name: String,
        description: String,
        account_type: AccountType,
        is_periodic: bool,
        periodicity_days: Option<i64>,
        notify: bool,
    ) -> DomainResult<Account> {
        Self::validate_periodicity(is_periodic, periodicity_days)?;
        if name.trim().is_empty() {
            return Err(DomainError::Validation("account name is required".into()));
        }
        let account = Account {
            id: format!("a_{}", Uuid::new_v4().simple()),
            name,
            description,
            account_type,
            is_periodic,
            periodicity_days: if is_periodic { periodicity_days } else { None },
            notify,
        };
        self.repository.create(&account)?;
        Ok(account)
    }

    pub fn update(&self, account: Account) -> DomainResult<Account> {
        Self::validate_periodicity(account.is_periodic, account.periodicity_days)?;
        self.repository.update(&account)?;
        Ok(account)
    }

    pub fn delete(&self, id: &str) -> DomainResult<()> {
        self.repository.delete(id)
    }

    fn validate_periodicity(is_periodic: bool, days: Option<i64>) -> DomainResult<()> {
        if is_periodic {
            match days {
                Some(value) if value > 0 => Ok(()),
                _ => Err(DomainError::Validation(
                    "periodic accounts require a positive periodicity_days".into(),
                )),
            }
        } else {
            Ok(())
        }
    }
}
