//! Wallet CRUD use cases.

use std::sync::Arc;

use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Wallet;
use crate::domain::ports::WalletRepository;

pub struct WalletService {
    repository: Arc<dyn WalletRepository>,
}

impl WalletService {
    #[must_use]
    pub fn new(repository: Arc<dyn WalletRepository>) -> Self {
        Self { repository }
    }

    /// List only active wallets. Used by UI listings and by the transaction
    /// form's wallet selector.
    pub fn list_active(&self) -> DomainResult<Vec<Wallet>> {
        self.repository.list_active()
    }

    /// List all wallets, including archived. Used by the export service.
    pub fn list_all(&self) -> DomainResult<Vec<Wallet>> {
        self.repository.list_all()
    }

    pub fn get(&self, id: &str) -> DomainResult<Wallet> {
        self.repository.get(id)
    }

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
            archived_at: None,
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

    /// Soft-delete: marks the wallet as archived. The row and any
    /// transactions referencing it remain in the database.
    pub fn archive(&self, id: &str) -> DomainResult<()> {
        self.repository.archive(id)
    }
}
