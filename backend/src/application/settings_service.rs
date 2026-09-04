//! Read and update user settings, including the notifier webhook URL.

use std::sync::Arc;

use crate::domain::errors::DomainResult;
use crate::domain::models::Settings;
use crate::domain::ports::SettingsRepository;

pub struct SettingsService {
    repository: Arc<dyn SettingsRepository>,
}

impl SettingsService {
    #[must_use]
    pub fn new(repository: Arc<dyn SettingsRepository>) -> Self {
        Self { repository }
    }

    pub fn load(&self) -> DomainResult<Settings> {
        self.repository.load()
    }

    pub fn save(&self, settings: Settings) -> DomainResult<Settings> {
        self.repository.save(&settings)?;
        Ok(settings)
    }
}
