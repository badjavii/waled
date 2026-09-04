//! SQLite connection pool wrapper.

use std::path::Path;

use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;

use crate::domain::errors::{DomainError, DomainResult};

pub type SqlitePool = Pool<SqliteConnectionManager>;

/// Open (or create) the SQLite database at `path` and return a pooled handle.
///
/// A brand-new database file is created empty — no synthetic wallets,
/// accounts, transactions or BCV rates are ever inserted here. Schema
/// creation lives in `migrations::run` and the single baseline settings
/// row is handled by `seed::run`.
///
/// # Errors
///
/// Returns [`DomainError::Persistence`] when the pool cannot be built.
pub fn build_pool(path: &Path) -> DomainResult<SqlitePool> {
    let manager = SqliteConnectionManager::file(path).with_flags(
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_URI,
    );
    let pool = Pool::builder()
        .max_size(8)
        .build(manager)
        .map_err(|err| DomainError::Persistence(err.to_string()))?;

    let connection = pool
        .get()
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    connection
        .execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    Ok(pool)
}
