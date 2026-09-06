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

/// A payment method. Soft-deletable via `archived_at`.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub name: String,
    pub description: String,
    pub is_digital: bool,
    /// UTC timestamp of when the wallet was archived, or `None` if active.
    /// Archived wallets are hidden from selectors and listings but kept
    /// in the database to preserve referential integrity with historical
    /// transactions.
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BcvRate {
    pub rate: f64,
    pub date: NaiveDate,
    pub fetched_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub account_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub due_date: NaiveDate,
    pub periodicity_days: i64,
    pub ves_amount: f64,
}
