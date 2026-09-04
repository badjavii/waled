//! Background scheduler that keeps the in-memory BCV rate fresh.

use std::sync::Arc;

use chrono::{Duration as ChronoDuration, Local, NaiveTime, TimeZone};
use tauri::async_runtime;
use tokio::sync::RwLock;
use tokio::time::{sleep, Duration};

use crate::domain::models::BcvRate;
use crate::domain::ports::BcvRateProvider;

/// Session-scoped snapshot of the BCV rate held in memory.
#[derive(Clone, Default)]
pub struct BcvRateState {
    inner: Arc<RwLock<Option<BcvRate>>>,
}

impl BcvRateState {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    pub async fn get(&self) -> Option<BcvRate> {
        self.inner.read().await.clone()
    }

    pub async fn set(&self, rate: Option<BcvRate>) {
        *self.inner.write().await = rate;
    }
}

/// Spawn the scheduler on Tauri's managed async runtime.
pub fn spawn(state: BcvRateState, provider: Arc<dyn BcvRateProvider>) {
    async_runtime::spawn(async move {
        refresh(&state, provider.as_ref()).await;
        loop {
            let wait = duration_until_next_refresh();
            log::info!(
                "next BCV refresh scheduled in {} minutes",
                wait.as_secs() / 60
            );
            sleep(wait).await;
            refresh(&state, provider.as_ref()).await;
        }
    });
}

async fn refresh(state: &BcvRateState, provider: &dyn BcvRateProvider) {
    match provider.fetch_current().await {
        Ok(rate) => {
            log::info!(
                "BCV rate refreshed: Bs {:.2} (date {})",
                rate.rate,
                rate.date
            );
            state.set(Some(rate)).await;
        }
        Err(error) => {
            log::warn!("BCV rate refresh failed, session state left as-is: {error}");
        }
    }
}

fn duration_until_next_refresh() -> Duration {
    let now = Local::now();
    let tomorrow = now.date_naive() + ChronoDuration::days(1);
    let target_time = NaiveTime::from_hms_opt(0, 5, 0).expect("valid time");
    let target = Local
        .from_local_datetime(&tomorrow.and_time(target_time))
        .single()
        .unwrap_or_else(|| now + ChronoDuration::hours(24));
    let delta = target.signed_duration_since(now);
    let seconds = delta.num_seconds().max(60);
    Duration::from_secs(seconds as u64)
}
