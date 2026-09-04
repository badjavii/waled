//! SQLite-backed implementation of [`AccountRepository`].

use rusqlite::{params, Row};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{Account, AccountType};
use crate::domain::ports::AccountRepository;

use super::SqlitePool;

pub struct SqliteAccountRepository {
    pool: SqlitePool,
}

impl SqliteAccountRepository {
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    fn map_row(row: &Row<'_>) -> rusqlite::Result<Account> {
        let type_label: String = row.get("account_type")?;
        let account_type = AccountType::from_label(&type_label).ok_or_else(|| {
            rusqlite::Error::FromSqlConversionFailure(
                0,
                rusqlite::types::Type::Text,
                format!("unknown account_type: {type_label}").into(),
            )
        })?;
        Ok(Account {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            account_type,
            is_periodic: row.get::<_, i64>("is_periodic")? != 0,
            periodicity_days: row.get("periodicity_days")?,
            notify: row.get::<_, i64>("notify")? != 0,
        })
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

impl AccountRepository for SqliteAccountRepository {
    fn list(&self) -> DomainResult<Vec<Account>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, name, description, account_type, is_periodic, \
                    periodicity_days, notify FROM accounts ORDER BY name",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_periodic(&self) -> DomainResult<Vec<Account>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let mut stmt = connection
            .prepare(
                "SELECT id, name, description, account_type, is_periodic, \
                    periodicity_days, notify FROM accounts \
                 WHERE is_periodic = 1 AND periodicity_days IS NOT NULL",
            )
            .map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn get(&self, id: &str) -> DomainResult<Account> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT id, name, description, account_type, is_periodic, \
                    periodicity_days, notify FROM accounts WHERE id = ?1",
                params![id],
                Self::map_row,
            )
            .map_err(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => {
                    DomainError::NotFound(format!("account {id}"))
                }
                other => DomainError::Persistence(other.to_string()),
            })
    }

    fn create(&self, account: &Account) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .execute(
                "INSERT INTO accounts (id, name, description, account_type, is_periodic, \
                    periodicity_days, notify) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    account.id,
                    account.name,
                    account.description,
                    account.account_type.as_label(),
                    account.is_periodic as i64,
                    account.periodicity_days,
                    account.notify as i64,
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }

    fn update(&self, account: &Account) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let affected = connection
            .execute(
                "UPDATE accounts SET name = ?2, description = ?3, account_type = ?4, \
                    is_periodic = ?5, periodicity_days = ?6, notify = ?7 WHERE id = ?1",
                params![
                    account.id,
                    account.name,
                    account.description,
                    account.account_type.as_label(),
                    account.is_periodic as i64,
                    account.periodicity_days,
                    account.notify as i64,
                ],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!("account {}", account.id)));
        }
        Ok(())
    }

    fn delete(&self, id: &str) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .execute("DELETE FROM accounts WHERE id = ?1", params![id])
            .map_err(|err| match err {
                rusqlite::Error::SqliteFailure(inner, _)
                    if inner.code == rusqlite::ErrorCode::ConstraintViolation =>
                {
                    DomainError::Conflict(
                        "account is referenced by existing transactions".into(),
                    )
                }
                other => DomainError::Persistence(other.to_string()),
            })?;
        Ok(())
    }

    fn count(&self) -> DomainResult<i64> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row("SELECT COUNT(*) FROM accounts", [], |row| row.get(0))
            .map_err(persist_err)
    }
}
