//! HTTP client that dispatches sync events to a user-owned Google Apps
//! Script deployment.
//!
//! Each request is strict-online: a 10-second timeout, and only 2xx
//! responses are accepted as success. Any other outcome bubbles up as
//! [`DomainError::NetworkRequired`] to signal the caller that the
//! operation must be rejected without local persistence.

use std::time::Duration;

use async_trait::async_trait;
use reqwest::Client;
use serde::Serialize;
use serde_json::json;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::ports::{SyncPort, SyncAccountPayload};

/// HTTP timeout for every sync call. See spec §7 "Notas de implementación".
const SYNC_TIMEOUT_SECONDS: u64 = 10;

/// App version stamped into every outgoing sync event, allowing GAS to
/// gate its behavior on future schema changes.
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

pub struct GasSyncClient {
    client: Client,
}

impl GasSyncClient {
    /// # Errors
    ///
    /// Returns [`DomainError::External`] if the underlying reqwest client
    /// cannot be constructed (extremely rare, indicates a broken TLS stack).
    pub fn new() -> DomainResult<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(SYNC_TIMEOUT_SECONDS))
            .build()
            .map_err(|err| {
                DomainError::NetworkRequired(format!(
                    "no se pudo inicializar el cliente HTTP de sincronización: {err}"
                ))
            })?;
        Ok(Self { client })
    }

    /// Send a JSON envelope to the sync webhook and validate the response.
    async fn dispatch<T: Serialize + ?Sized>(
        &self,
        webhook_url: &str,
        event_type: &str,
        payload: &T,
    ) -> DomainResult<()> {
        let envelope = json!({
            "type": event_type,
            "app_version": APP_VERSION,
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "payload": payload,
        });

        let response = self
            .client
            .post(webhook_url)
            .json(&envelope)
            .send()
            .await
            .map_err(|err| {
                DomainError::NetworkRequired(format!(
                    "no se pudo contactar el webhook de sincronización: {err}"
                ))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            let snippet = summarize_response_body(&body);
            return Err(DomainError::NetworkRequired(format!(
                "el webhook de sincronización respondió {status}. {snippet}"
            )));
        }

        Ok(())
    }
}

#[async_trait]
impl SyncPort for GasSyncClient {
    async fn notify_account_created(
        &self,
        webhook_url: &str,
        payload: &SyncAccountPayload,
    ) -> DomainResult<()> {
        self.dispatch(webhook_url, "create_account", payload).await
    }

    async fn notify_account_updated(
        &self,
        webhook_url: &str,
        payload: &SyncAccountPayload,
    ) -> DomainResult<()> {
        self.dispatch(webhook_url, "update_account", payload).await
    }

    async fn notify_account_archived(
        &self,
        webhook_url: &str,
        account_id: &str,
    ) -> DomainResult<()> {
        let payload = json!({ "id": account_id });
        self.dispatch(webhook_url, "archive_account", &payload).await
    }

    async fn ping(&self, webhook_url: &str) -> DomainResult<()> {
        let payload = json!({});
        self.dispatch(webhook_url, "ping", &payload).await
    }
}

/// Reduce a webhook response body to a short, human-readable snippet.
///
/// Google Apps Script often returns full HTML login/error pages when the
/// deployment URL is wrong or unauthorized. Dumping that HTML into an
/// error message overwhelms the UI, so we detect common shapes and
/// return a concise diagnostic instead of the raw body.
fn summarize_response_body(body: &str) -> String {
    let trimmed = body.trim();

    if trimmed.is_empty() {
        return "El servidor no devolvió contenido en la respuesta.".to_string();
    }

    // Heuristics for the most common Google Apps Script failure modes.
    let lowered = trimmed.to_lowercase();
    if lowered.contains("<!doctype html") || lowered.starts_with("<html") {
        if lowered.contains("google accounts") || lowered.contains("signin") {
            return "Google devolvió una página de inicio de sesión. \
                    Verifica que el script esté desplegado como Web App con acceso 'Anyone'."
                .to_string();
        }
        if lowered.contains("script function not found") {
            return "El script existe pero no expone la función 'doPost'. \
                    Revisa el código del script."
                .to_string();
        }
        return "El servidor devolvió una página HTML en lugar de una respuesta del script. \
                Verifica que la URL apunte a un despliegue Web App activo."
            .to_string();
    }

    // Non-HTML body: truncate to a reasonable length.
    const MAX_LEN: usize = 200;
    if trimmed.chars().count() > MAX_LEN {
        let truncated: String = trimmed.chars().take(MAX_LEN).collect();
        format!("{truncated}…")
    } else {
        trimmed.to_string()
    }
}
