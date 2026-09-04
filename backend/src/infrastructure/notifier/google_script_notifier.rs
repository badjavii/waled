//! HTTP adapter that posts reminder payloads to a Google Apps Script webhook.

use async_trait::async_trait;
use reqwest::Client;
use std::time::Duration;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::ports::{NotificationSender, ReminderNotificationPayload};

/// Concrete [`NotificationSender`] backed by the async `reqwest` client.
pub struct GoogleScriptNotifier {
    client: Client,
}

impl GoogleScriptNotifier {
    /// Build a notifier with a 15-second timeout.
    ///
    /// # Errors
    ///
    /// Returns [`DomainError::Notification`] when the HTTP client cannot be built.
    pub fn new() -> DomainResult<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|err| DomainError::Notification(err.to_string()))?;
        Ok(Self { client })
    }
}

#[async_trait]
impl NotificationSender for GoogleScriptNotifier {
    async fn send_reminder(
        &self,
        webhook_url: &str,
        payload: &ReminderNotificationPayload,
    ) -> DomainResult<()> {
        let response = self
            .client
            .post(webhook_url)
            .json(payload)
            .send()
            .await
            .map_err(|err| DomainError::Notification(err.to_string()))?;

        if !response.status().is_success() {
            return Err(DomainError::Notification(format!(
                "webhook returned status {}",
                response.status()
            )));
        }
        Ok(())
    }
}
