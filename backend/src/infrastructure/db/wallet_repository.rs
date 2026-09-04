//! SQLite-backed implementation of [`WalletRepository`].

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
        Ok(Wallet {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            is_digital: row.get::<_, i64>("is_digital")? != 0,
        })
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

impl WalletRepository for SqliteWalletRepository {
    fn list(&self) -> DomainResult<Vec<Wallet>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare("SELECT id, name, description, is_digital FROM wallets ORDER BY name")
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
                "SELECT id, name, description, is_digital FROM wallets WHERE id = ?1",
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
        connection
            .execute(
                "INSERT INTO wallets (id, name, description, is_digital) \
                 VALUES (?1, ?2, ?3, ?4)",
                params![
                    wallet.id,
                    wallet.name,
                    wallet.description,
                    wallet.is_digital as i64
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }

    fn update(&self, wallet: &Wallet) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let affected = connection
            .execute(
                "UPDATE wallets SET name = ?2, description = ?3, is_digital = ?4 WHERE id = ?1",
                params![
                    wallet.id,
                    wallet.name,
                    wallet.description,
                    wallet.is_digital as i64
                ],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!("wallet {}", wallet.id)));
        }
        Ok(())
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .execute("DELETE FROM wallets WHERE id = ?1", params![id])
            .map_err(|err| match err {
                rusqlite::Error::SqliteFailure(inner, _)
                    if inner.code == rusqlite::ErrorCode::ConstraintViolation =>
                {
                    DomainError::Conflict(
                        "wallet is referenced by existing transactions".into(),
                    )
                }
                other => DomainError::Persistence(other.to_string()),
            })?;
        Ok(())
    }

    fn count(&self) -> DomainResult<i64> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row("SELECT COUNT(*) FROM wallets", [], |row| row.get(0))
            .map_err(persist_err)
    }
}
