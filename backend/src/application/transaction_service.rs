//! Transaction CRUD use cases.

use std::sync::Arc;

use chrono::{NaiveDate, Utc};
use uuid::Uuid;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Transaction;
use crate::domain::ports::{AccountRepository, TransactionRepository, WalletRepository};

pub struct TransactionService {
    transactions: Arc<dyn TransactionRepository>,
    accounts: Arc<dyn AccountRepository>,
    wallets: Arc<dyn WalletRepository>,
}

impl TransactionService {
    #[must_use]
    pub fn new(
        transactions: Arc<dyn TransactionRepository>,
        accounts: Arc<dyn AccountRepository>,
        wallets: Arc<dyn WalletRepository>,
    ) -> Self {
        Self {
            transactions,
            accounts,
            wallets,
        }
    }

    pub fn list(&self) -> DomainResult<Vec<Transaction>> {
        self.transactions.list()
    }

    pub fn list_between(&self, from: NaiveDate, to: NaiveDate) -> DomainResult<Vec<Transaction>> {
        self.transactions.list_between(from, to)
    }

    pub fn get(&self, id: &str) -> DomainResult<Transaction> {
        self.transactions.get(id)
    }

    /// Register a new transaction with a frontend-supplied BCV rate.
    ///
    /// The rate value comes from the UI: either the session BCV state
    /// (automatic toggle) or a manual value typed by the user (manual
    /// toggle). Whichever it is, the backend just validates and freezes.
    pub fn create(
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
            return Err(DomainError::Validation("ves_amount must be positive".into()));
        }
        if bcv_rate_at_payment <= 0.0 {
            return Err(DomainError::Validation(
                "bcv_rate_at_payment must be positive".into(),
            ));
        }

        let _account = self.accounts.get(&account_id)?;
        let wallet = self.wallets.get(&wallet_id)?;
        let reference = Self::normalize_reference(wallet.is_digital, payment_reference)?;

        let transaction = Transaction {
            id: format!("t_{}", Uuid::new_v4().simple()),
            account_id,
            wallet_id,
            ves_amount: round_two_decimals(ves_amount),
            payment_date,
            created_at: Utc::now(),
            description,
            payment_reference: reference,
            bcv_rate_at_payment,
        };

        self.transactions.create(&transaction)?;
        Ok(transaction)
    }

    pub fn update(
        &self,
        id: String,
        account_id: String,
        wallet_id: String,
        ves_amount: f64,
        payment_date: NaiveDate,
        description: String,
        payment_reference: Option<String>,
        bcv_rate_at_payment: f64,
    ) -> DomainResult<Transaction> {
        if ves_amount <= 0.0 {
            return Err(DomainError::Validation("ves_amount must be positive".into()));
        }
        if bcv_rate_at_payment <= 0.0 {
            return Err(DomainError::Validation(
                "bcv_rate_at_payment must be positive".into(),
            ));
        }

        let existing = self.transactions.get(&id)?;
        let _account = self.accounts.get(&account_id)?;
        let wallet = self.wallets.get(&wallet_id)?;
        let reference = Self::normalize_reference(wallet.is_digital, payment_reference)?;

        let updated = Transaction {
            id,
            account_id,
            wallet_id,
            ves_amount: round_two_decimals(ves_amount),
            payment_date,
            created_at: existing.created_at,
            description,
            payment_reference: reference,
            bcv_rate_at_payment,
        };

        self.transactions.update(&updated)?;
        Ok(updated)
    }

    pub fn delete(&self, id: &str) -> DomainResult<()> {
        self.transactions.delete(id)
    }

    fn normalize_reference(
        wallet_is_digital: bool,
        reference: Option<String>,
    ) -> DomainResult<Option<String>> {
        match (wallet_is_digital, reference) {
            (true, value) => Ok(value.filter(|text| !text.trim().is_empty())),
            (false, Some(value)) if !value.trim().is_empty() => Err(DomainError::Validation(
                "payment_reference is only allowed for digital wallets".into(),
            )),
            (false, _) => Ok(None),
        }
    }
}

fn round_two_decimals(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}
