//! Wallet CRUD use cases.

use std::sync::Arc;

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Wallet;
use crate::domain::ports::WalletRepository;

/// Coordinates wallet lifecycle operations against a `WalletRepository`.
pub struct WalletService {
    repository: Arc<dyn WalletRepository>,
}

impl WalletService {
    #[must_use]
    pub fn new(repository: Arc<dyn WalletRepository>) -> Self {
        Self { repository }
    }

    pub fn list(&self) -> DomainResult<Vec<Wallet>> {
        self.repository.list()
    }

    pub fn get(&self, id: &str) -> DomainResult<Wallet> {
        self.repository.get(id)
    }

    /// Create a new wallet with a generated identifier.
    ///
    /// # Arguments
    ///
    /// * `name` - Human-readable name (required).
    /// * `description` - Optional descriptive text.
    /// * `is_digital` - Whether the wallet supports payment references.
    ///
    /// # Returns
    ///
    /// The persisted wallet, including its new id.
    ///
    /// # Errors
    ///
    /// Returns [`DomainError::Validation`] on empty names or a persistence
    /// error propagated from the repository.
    pub fn create(
        &self,
        name: String,
        description: String,
        is_digital: bool,
    ) -> DomainResult<Wallet> {
        if name.trim().is_empty() {
            return Err(DomainError::Validation("wallet name is required".into()));
        }
        let wallet = Wallet {
            id: format!("w_{}", Uuid::new_v4().simple()),
            name,
            description,
            is_digital,
        };
        self.repository.create(&wallet)?;
        Ok(wallet)
    }

    pub fn update(&self, wallet: Wallet) -> DomainResult<Wallet> {
        if wallet.name.trim().is_empty() {
            return Err(DomainError::Validation("wallet name is required".into()));
        }
        self.repository.update(&wallet)?;
        Ok(wallet)
    }

    pub fn delete(&self, id: &str) -> DomainResult<()> {
        self.repository.delete(id)
    }
}
