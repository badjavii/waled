//! Core domain models for the Waled expense tracker.
//!
//! All monetary amounts are stored in Venezuelan Bolívares (VES). The
//! USD equivalent of a transaction is derived at read time from its
//! frozen `bcv_rate_at_payment`.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// High level classification for an expense account.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AccountType {
    #[serde(rename = "Servicios Básicos")]
    BasicServices,
    #[serde(rename = "Alimentación")]
    Food,
    Ocio,
    #[serde(rename = "Transporte")]
    Transport,
    Vivienda,
    #[serde(rename = "Educación")]
    Education,
    Salud,
}

impl AccountType {
    #[must_use]
    pub fn as_label(&self) -> &'static str {
        match self {
            Self::BasicServices => "Servicios Básicos",
            Self::Food => "Alimentación",
            Self::Ocio => "Ocio",
            Self::Transport => "Transporte",
            Self::Vivienda => "Vivienda",
            Self::Education => "Educación",
            Self::Salud => "Salud",
        }
    }

    #[must_use]
    pub fn from_label(label: &str) -> Option<Self> {
        match label {
            "Servicios Básicos" => Some(Self::BasicServices),
            "Alimentación" => Some(Self::Food),
            "Ocio" => Some(Self::Ocio),
            "Transporte" => Some(Self::Transport),
            "Vivienda" => Some(Self::Vivienda),
            "Educación" => Some(Self::Education),
            "Salud" => Some(Self::Salud),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_digital: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub description: String,
    pub account_type: AccountType,
    pub is_periodic: bool,
    pub periodicity_days: Option<i64>,
    pub notify: bool,
}

/// A registered expense with two independent dates and a frozen rate.
///
/// - `payment_date`: user-selected accounting date (day the money moved).
///   Governs the month the expense belongs to.
/// - `created_at`: immutable audit stamp set by the backend at insert time.
///   Never edited on update.
/// - `bcv_rate_at_payment`: the exact rate applied to compute the USD
///   equivalent for this expense. Frozen at creation, never recomputed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub account_id: String,
    pub wallet_id: String,
    pub ves_amount: f64,
    pub payment_date: NaiveDate,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub description: String,
    pub payment_reference: Option<String>,
    pub bcv_rate_at_payment: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub user_name: String,
    pub user_email: String,
    pub gas_webhook_url: String,
}

/// Live snapshot of the BCV rate held in memory. Never persisted —
/// refreshed at startup and at midnight from DolarApi.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BcvRate {
    /// Bolívares per 1 USD.
    pub rate: f64,
    /// Publication date reported by the upstream provider (ISO date).
    pub date: NaiveDate,
    /// Timestamp of the local fetch that produced this snapshot.
    pub fetched_at: chrono::DateTime<chrono::Utc>,
}

/// Derived reminder for a periodic account. Not persisted.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub account_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub due_date: NaiveDate,
    pub periodicity_days: i64,
    pub ves_amount: f64,
}
