//! HTTP adapter that fetches the official BCV rate from DolarApi.
//!
//! Endpoint: https://ve.dolarapi.com/v1/dolares/oficial
//! Response shape (relevant fields):
//!   {
//!     "promedio": 138.42,
//!     "fechaActualizacion": "2026-09-02T15:30:00.000Z",
//!     ...
//!   }

use async_trait::async_trait;
use chrono::{DateTime, NaiveDate, Utc};
use reqwest::Client;
use serde::Deserialize;
use std::time::Duration;

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::BcvRate;
use crate::domain::ports::BcvRateProvider;

const ENDPOINT: &str = "https://ve.dolarapi.com/v1/dolares/oficial";
const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Deserialize)]
struct DolarApiResponse {
    promedio: f64,
    #[serde(rename = "fechaActualizacion")]
    fecha_actualizacion: String,
}

pub struct DolarApiClient {
    client: Client,
}

impl DolarApiClient {
    pub fn new() -> DomainResult<Self> {
        let client = Client::builder()
            .timeout(REQUEST_TIMEOUT)
            .user_agent("Waled/0.1 (+https://github.com/badjavii/waled)")
            .build()
            .map_err(|err| DomainError::Unexpected(err.to_string()))?;
        Ok(Self { client })
    }
}

#[async_trait]
impl BcvRateProvider for DolarApiClient {
    async fn fetch_current(&self) -> DomainResult<BcvRate> {
        let response = self
            .client
            .get(ENDPOINT)
            .send()
            .await
            .map_err(|err| DomainError::Unexpected(format!("dolarapi request failed: {err}")))?;

        if !response.status().is_success() {
            return Err(DomainError::Unexpected(format!(
                "dolarapi returned status {}",
                response.status()
            )));
        }

        let payload: DolarApiResponse = response
            .json()
            .await
            .map_err(|err| DomainError::Unexpected(format!("dolarapi payload invalid: {err}")))?;

        if payload.promedio <= 0.0 {
            return Err(DomainError::Unexpected(
                "dolarapi returned non-positive rate".into(),
            ));
        }

        let fetched_at = Utc::now();
        let date = parse_publication_date(&payload.fecha_actualizacion, fetched_at);

        Ok(BcvRate {
            rate: round_two(payload.promedio),
            date,
            fetched_at,
        })
    }
}

fn parse_publication_date(raw: &str, fallback: DateTime<Utc>) -> NaiveDate {
    DateTime::parse_from_rfc3339(raw)
        .map(|dt| dt.with_timezone(&Utc).date_naive())
        .unwrap_or_else(|_| fallback.date_naive())
}

fn round_two(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}
