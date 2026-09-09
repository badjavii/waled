//! SQLite-backed implementation of [`SettingsRepository`].

use rusqlite::params;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Settings;
use crate::domain::ports::SettingsRepository;

use super::SqlitePool;

pub struct SqliteSettingsRepository {
    pool: SqlitePool,
}

impl SqliteSettingsRepository {
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

fn persist_err(err: impl std::fmt::Display) -> DomainError {
    DomainError::Persistence(err.to_string())
}

impl SettingsRepository for SqliteSettingsRepository {
    fn load(&self) -> DomainResult<Settings> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .query_row(
                "SELECT user_name, user_email, gas_reminder_webhook_url, gas_sync_webhook_url \
                 FROM settings WHERE id = 1",
                [],
                |row| {
                    Ok(Settings {
                        user_name: row.get(0)?,
                        user_email: row.get(0 + 1)?,
                        gas_reminder_webhook_url: row.get(2)?,
                        gas_sync_webhook_url: row.get(3)?,
                    })
                },
            )
            .map_err(persist_err)
    }

    fn save(&self, settings: &Settings) -> DomainResult<()> {
        let connection = self.pool.get().map_err(persist_err)?;
        connection
            .execute(
                "INSERT INTO settings (id, user_name, user_email, gas_reminder_webhook_url, gas_sync_webhook_url) \
                 VALUES (1, ?1, ?2, ?3, ?4) \
                 ON CONFLICT(id) DO UPDATE SET \
                    user_name = excluded.user_name, \
                    user_email = excluded.user_email, \
                    gas_reminder_webhook_url = excluded.gas_reminder_webhook_url, \
                    gas_sync_webhook_url = excluded.gas_sync_webhook_url",
                params![
                    settings.user_name,
                    settings.user_email,
                    settings.gas_reminder_webhook_url,
                    settings.gas_sync_webhook_url,
                ],
            )
            .map_err(persist_err)?;
        Ok(())
    }
}
