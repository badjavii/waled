//! SQLite-backed implementation of [`TransactionRepository`].

use chrono::{DateTime, NaiveDate, Utc};
use rusqlite::{params, Row};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Transaction;
use crate::domain::ports::TransactionRepository;

use super::SqlitePool;

pub struct SqliteTransactionRepository {
    pool: SqlitePool,
}

impl SqliteTransactionRepository {
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<Transaction> {
        let payment_text: String = row.get("payment_date")?;
        let created_text: String = row.get("created_at")?;
        let payment_date =
            NaiveDate::parse_from_str(&payment_text, "%Y-%m-%d").map_err(|err| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(err),
                )
            })?;
        let created_at = DateTime::parse_from_rfc3339(&created_text)
            .map(|dt| dt.with_timezone(&Utc))
            .map_err(|err| {
                rusqlite::Error::FromSqlConversionFailure(
                    0,
                    rusqlite::types::Type::Text,
                    Box::new(err),
                )
            })?;
        Ok(Transaction {
            id: row.get("id")?,
            account_id: row.get("account_id")?,
            wallet_id: row.get("wallet_id")?,
            ves_amount: row.get("ves_amount")?,
            payment_date,
            created_at,
            description: row.get("description")?,
            payment_reference: row.get("payment_reference")?,
            bcv_rate_at_payment: row.get("bcv_rate_at_payment")?,
        })
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

impl TransactionRepository for SqliteTransactionRepository {
    fn list(&self) -> DomainResult<Vec<Transaction>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, account_id, wallet_id, ves_amount, payment_date, created_at, \
                    description, payment_reference, bcv_rate_at_payment \
                 FROM transactions ORDER BY payment_date DESC, created_at DESC",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_between(&self, from: NaiveDate, to: NaiveDate) -> DomainResult<Vec<Transaction>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, account_id, wallet_id, ves_amount, payment_date, created_at, \
                    description, payment_reference, bcv_rate_at_payment \
                 FROM transactions WHERE payment_date BETWEEN ?1 AND ?2 \
                 ORDER BY payment_date DESC",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map(params![from.to_string(), to.to_string()], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_by_account(&self, account_id: &str) -> DomainResult<Vec<Transaction>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, account_id, wallet_id, ves_amount, payment_date, created_at, \
                    description, payment_reference, bcv_rate_at_payment \
                 FROM transactions WHERE account_id = ?1 ORDER BY payment_date DESC",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map(params![account_id], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn last_by_account(&self, account_id: &str) -> DomainResult<Option<Transaction>> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT id, account_id, wallet_id, ves_amount, payment_date, created_at, \
                    description, payment_reference, bcv_rate_at_payment \
                 FROM transactions WHERE account_id = ?1 \
                 ORDER BY payment_date DESC LIMIT 1",
                params![account_id],
                Self::map_row,
            )
            .map(Some)
            .or_else(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => Ok(None),
                other => Err(DomainError::Persistence(other.to_string())),
            })
    }

    fn get(&self, id: &str) -> DomainResult<Transaction> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT id, account_id, wallet_id, ves_amount, payment_date, created_at, \
                    description, payment_reference, bcv_rate_at_payment \
                 FROM transactions WHERE id = ?1",
                params![id],
                Self::map_row,
            )
            .map_err(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => {
                    DomainError::NotFound(format!("transaction {id}"))
                }
                other => DomainError::Persistence(other.to_string()),
            })
    }

    fn create(&self, transaction: &Transaction) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .execute(
                "INSERT INTO transactions (id, account_id, wallet_id, ves_amount, \
                    payment_date, created_at, description, payment_reference, \
                    bcv_rate_at_payment) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    transaction.id,
                    transaction.account_id,
                    transaction.wallet_id,
                    transaction.ves_amount,
                    transaction.payment_date.to_string(),
                    transaction.created_at.to_rfc3339(),
                    transaction.description,
                    transaction.payment_reference,
                    transaction.bcv_rate_at_payment,
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }

    fn update(&self, transaction: &Transaction) -> DomainResult<()> {
        // Note: `created_at` is immutable and intentionally not part of the SET clause.
        let connection = self.pool.get().map_err(persist_err)?;
        let affected = connection
            .execute(
                "UPDATE transactions SET account_id = ?2, wallet_id = ?3, ves_amount = ?4, \
                    payment_date = ?5, description = ?6, payment_reference = ?7, \
                    bcv_rate_at_payment = ?8 WHERE id = ?1",
                params![
                    transaction.id,
                    transaction.account_id,
                    transaction.wallet_id,
                    transaction.ves_amount,
                    transaction.payment_date.to_string(),
                    transaction.description,
                    transaction.payment_reference,
                    transaction.bcv_rate_at_payment,
                ],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!(
                "transaction {}",
                transaction.id
            )));
        }
        Ok(())
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let affected = connection
            .execute("DELETE FROM transactions WHERE id = ?1", params![id])
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!("transaction {id}")));
        }
        Ok(())
    }
}
