//! Idempotent schema bootstrap.

use rusqlite::params;

use crate::domain::errors::{DomainError, DomainResult};

use super::SqlitePool;

const SCHEMA: &str = r"
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_digital INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    account_type TEXT NOT NULL,
    is_periodic INTEGER NOT NULL DEFAULT 0,
    periodicity_days INTEGER,
    notify INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
    ves_amount REAL NOT NULL,
    payment_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    payment_reference TEXT,
    bcv_rate_at_payment REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    user_name TEXT NOT NULL DEFAULT '',
    user_email TEXT NOT NULL DEFAULT '',
    gas_webhook_url TEXT NOT NULL DEFAULT ''
);
";

/// Apply the base schema. Safe to call on every startup.
///
/// v0.2.0 note: this migration is destructive by design — if you upgrade
/// from v0.1.x, delete the local `waled.db` file before running the app.
/// See draft.md §7 for details.
pub fn run(pool: &SqlitePool) -> DomainResult<()> {
    let connection = pool
        .get()
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    connection
        .execute_batch(SCHEMA)
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    // Drop the legacy bcv_rates table if it existed in v0.1.x.
    connection
        .execute("DROP TABLE IF EXISTS bcv_rates", params![])
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    Ok(())
}
