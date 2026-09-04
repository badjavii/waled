//! Bootstrap of non-negotiable baseline rows.
//!
//! This module is intentionally minimal. Per the project's clean-code
//! policy, no synthetic wallets, accounts, transactions, or BCV rates are
//! ever inserted from source code — a fresh database stays empty and the
//! frontend renders its empty states.
//!
//! The only exception is the single-row `settings` record: the schema
//! pins it to `id = 1` and the rest of the application (loaders,
//! exporters, notifier) assumes it always exists. We therefore ensure
//! that row is present with empty values, so the user can fill it in
//! from the Settings modal without the app crashing on first launch.

use rusqlite::params;

use crate::domain::errors::{DomainError, DomainResult};

use super::SqlitePool;

/// Ensure the singleton `settings` row exists with empty defaults.
///
/// Idempotent: running it on an already-initialised database is a no-op.
///
/// # Errors
///
/// Returns [`DomainError::Persistence`] when the connection cannot be
/// acquired or the statement fails.
pub fn run(pool: &SqlitePool) -> DomainResult<()> {
    let connection = pool
        .get()
        .map_err(|err| DomainError::Persistence(err.to_string()))?;

    connection
        .execute(
            "INSERT INTO settings (id, user_name, user_email, gas_webhook_url) \
             VALUES (1, '', '', '') \
             ON CONFLICT(id) DO NOTHING",
            params![],
        )
        .map_err(|err| DomainError::Persistence(err.to_string()))?;

    Ok(())
}
