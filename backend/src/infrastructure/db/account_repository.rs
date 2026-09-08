//! SQLite-backed implementation of [`AccountRepository`].

use chrono::{DateTime, Utc};
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
        Ok(Account {
            id: row.get("id")?,
            name: row.get("name")?,
            description: row.get("description")?,
            account_type,
            is_periodic: row.get::<_, i64>("is_periodic")? != 0,
            periodicity_days: row.get("periodicity_days")?,
            notify: row.get::<_, i64>("notify")? != 0,
            archived_at,
        })
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

const SELECT_COLUMNS: &str =
    "id, name, description, account_type, is_periodic, periodicity_days, notify, archived_at";

impl AccountRepository for SqliteAccountRepository {
    fn list_active(&self) -> DomainResult<Vec<Account>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let sql = format!(
            "SELECT {SELECT_COLUMNS} FROM accounts WHERE archived_at IS NULL ORDER BY name"
        );
        let mut stmt = connection.prepare(&sql).map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_all(&self) -> DomainResult<Vec<Account>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let sql = format!(
            "SELECT {SELECT_COLUMNS} FROM accounts \
             ORDER BY archived_at IS NOT NULL, name"
        );
        let mut stmt = connection.prepare(&sql).map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn list_active_periodic(&self) -> DomainResult<Vec<Account>> {
        let connection = self.pool.get().map_err(persist_err)?;
        let sql = format!(
            "SELECT {SELECT_COLUMNS} FROM accounts \
             WHERE archived_at IS NULL \
               AND is_periodic = 1 \
               AND periodicity_days IS NOT NULL"
        );
        let mut stmt = connection.prepare(&sql).map_err(persist_err)?;
        let rows = stmt
            .query_map([], Self::map_row)
            .map_err(persist_err)?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(persist_err)?;
        Ok(rows)
    }

    fn get(&self, id: &str) -> DomainResult<Account> {
        let connection = self.pool.get().map_err(persist_err)?;
        let sql = format!("SELECT {SELECT_COLUMNS} FROM accounts WHERE id = ?1");
        connection
            .query_row(&sql, params![id], Self::map_row)
            .map_err(|err| match err {
                rusqlite::Error::QueryReturnedNoRows => {
                    DomainError::NotFound(format!("account {id}"))
                }
                other => DomainError::Persistence(other.to_string()),
            })
    }

    fn create(&self, account: &Account) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let archived_text = account.archived_at.map(|dt| dt.to_rfc3339());
        connection
            .execute(
                "INSERT INTO accounts (id, name, description, account_type, is_periodic, \
                    periodicity_days, notify, archived_at) \
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    account.id,
                    account.name,
                    account.description,
                    account.account_type.as_label(),
                    account.is_periodic as i64,
                    account.periodicity_days,
                    account.notify as i64,
                    archived_text,
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }

    fn update(&self, account: &Account) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let archived_text = account.archived_at.map(|dt| dt.to_rfc3339());
        let affected = connection
            .execute(
                "UPDATE accounts SET name = ?2, description = ?3, account_type = ?4, \
                    is_periodic = ?5, periodicity_days = ?6, notify = ?7, \
                    archived_at = ?8 WHERE id = ?1",
                params![
                    account.id,
                    account.name,
                    account.description,
                    account.account_type.as_label(),
                    account.is_periodic as i64,
                    account.periodicity_days,
                    account.notify as i64,
                    archived_text,
                ],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!("account {}", account.id)));
        }
        Ok(())
    }

    fn archive(&self, id: &str) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        let now = Utc::now().to_rfc3339();
        let affected = connection
            .execute(
                "UPDATE accounts SET archived_at = ?2 WHERE id = ?1 AND archived_at IS NULL",
                params![id, now],
            )
            .map_err(persist_err)?;
        if affected == 0 {
            return Err(DomainError::NotFound(format!(
                "account {id} not found or already archived"
            )));
        }
        Ok(())
    }

    fn count(&self) -> DomainResult<i64> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT COUNT(*) FROM accounts WHERE archived_at IS NULL",
                [],
                |row| row.get(0),
            )
            .map_err(persist_err)
    }
}
