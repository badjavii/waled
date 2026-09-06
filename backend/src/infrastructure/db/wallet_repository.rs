//! SQLite-backed implementation of [`WalletRepository`].

use chrono::{DateTime, Utc};
use rusqlite::{params, Row};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Wallet;
use crate::domain::ports::WalletRepository;

use super::SqlitePool;

pub struct SqliteWalletRepository {
    pool: SqlitePool,
}

impl SqliteWalletRepository {
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<Wallet> {
        let archived_text: Option<String> = row.get("archived_at")?;
        let archived_at = match archived_text {
            Some(text) => Some(
                DateTime::parse_from_rfc3339(&text)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|err| {
                        rusqlite::Error::FromSqlConversionFailure(
                            0,
                            rusqlite::types::Type::Text,
                            Box::new(err),
                        )
                    })?,
            ),
            None => None,
        };
        Ok(Wallet {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            is_digital: row.get::<_, i64>("is_digital")? != 0,
            archived_at,
        })
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

impl WalletRepository for SqliteWalletRepository {
    fn list_active(&self) -> DomainResult<Vec<Wallet>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, name, description, is_digital, archived_at \
                 FROM wallets WHERE archived_at IS NULL ORDER BY name",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_all(&self) -> DomainResult<Vec<Wallet>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, name, description, is_digital, archived_at \
                 FROM wallets ORDER BY archived_at IS NOT NULL, name",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn get(&self, id: &str) -> DomainResult<Wallet> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT id, name, description, is_digital, archived_at \
                 FROM wallets WHERE id = ?1",
                params![id],
                Self::map_row,
            )
            .map_err(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => {
                    DomainError::NotFound(format!("wallet {id}"))
                }
                other => DomainError::Persistence(other.to_string()),
            })
    }

    fn create(&self, wallet: &Wallet) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let archived_text = wallet.archived_at.map(|dt| dt.to_rfc3339());
        connection
            .execute(
                "INSERT INTO wallets (id, name, description, is_digital, archived_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    wallet.id,
                    wallet.name,
                    wallet.description,
                    wallet.is_digital as i64,
                    archived_text,
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }

    fn update(&self, wallet: &Wallet) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let archived_text = wallet.archived_at.map(|dt| dt.to_rfc3339());
        let affected = connection
            .execute(
                "UPDATE wallets SET name = ?2, description = ?3, is_digital = ?4, \
                    archived_at = ?5 WHERE id = ?1",
                params![
                    wallet.id,
                    wallet.name,
                    wallet.description,
                    wallet.is_digital as i64,
                    archived_text,
                ],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!("wallet {}", wallet.id)));
        }
        Ok(())
    }

    fn archive(&self, id: &str) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let now = Utc::now().to_rfc3339();
        let affected = connection
            .execute(
                "UPDATE wallets SET archived_at = ?2 WHERE id = ?1 AND archived_at IS NULL",
                params![id, now],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!(
                "wallet {id} not found or already archived"
            )));
        }
        Ok(())
    }

    fn count(&self) -> DomainResult<i64> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT COUNT(*) FROM wallets WHERE archived_at IS NULL",
                [],
                |row| row.get(0),
            )
            .map_err(persist_err)
    }
}
