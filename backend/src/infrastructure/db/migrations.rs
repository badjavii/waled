//! Idempotent schema bootstrap.

use rusqlite::params;

use crate::domain::errors::{DomainError, DomainResult};

use super::SqlitePool;

const SCHEMA: &str = r"
CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_digital INTEGER NOT NULL DEFAULT 0
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

/// Apply the base schema and any pending column migrations.
pub fn run(pool: &SqlitePool) -> DomainResult<()> {
    {
        let connection = pool
            .get()
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
        connection
            .execute_batch(SCHEMA)
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
    }
    migrate_transactions_v2(pool)?;
    Ok(())
}

fn migrate_transactions_v2(pool: &SqlitePool) -> DomainResult<()> {
    let connection = pool
        .get()
        .map_err(|err| DomainError::Persistence(err.to_string()))?;

    let mut columns = std::collections::HashSet::new();
    {
        let mut stmt = connection
            .prepare("PRAGMA table_info(transactions)")
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
        let mut rows = stmt
            .query([])
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
        while let Some(row) = rows
            .next()
            .map_err(|err| DomainError::Persistence(err.to_string()))?
        {
            let name: String = row
                .get(1)
                .map_err(|err| DomainError::Persistence(err.to_string()))?;
            columns.insert(name);
        }
    }

    let has_v2 = columns.contains("payment_date")
        && columns.contains("created_at")
        && columns.contains("bcv_rate_at_payment");
    let has_legacy_date = columns.contains("transaction_date");
    let has_legacy_rate = columns.contains("bcv_rate_at_registration");

    if has_v2 && !has_legacy_date && !has_legacy_rate {
        return Ok(());
    }
    if has_v2 && (has_legacy_date || has_legacy_rate) {
        connection
            .execute(
                "UPDATE transactions
                    SET payment_date        = COALESCE(payment_date, transaction_date),
                        created_at          = COALESCE(created_at, transaction_date || 'T00:00:00Z'),
                        bcv_rate_at_payment = COALESCE(bcv_rate_at_payment, bcv_rate_at_registration)
                    WHERE payment_date IS NULL
                       OR created_at IS NULL
                       OR bcv_rate_at_payment IS NULL",
                params![],
            )
            .map_err(|err| DomainError::Persistence(err.to_string()))?;
    }
    // Drop the obsolete rates table if a previous version created it.
    connection
        .execute("DROP TABLE IF EXISTS bcv_rates", params![])
        .map_err(|err| DomainError::Persistence(err.to_string()))?;
    Ok(())
}
