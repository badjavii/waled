//! Core domain models for the Waled expense tracker.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

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
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// An expense bucket. Soft-deletable via `archived_at`.
///
/// Periodic accounts use a monthly billing window defined by `start_day`
/// (default 1) and `due_day` (required). Both are 1-31 and satisfy
/// `start_day <= due_day` (no cross-month windows in v0.2.0).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub description: String,
    pub account_type: AccountType,
    pub is_periodic: bool,
    /// Day of the month when the billing window opens. Default 1 if not
    /// specified by the user. `None` for non-periodic accounts.
    pub start_day: Option<i64>,
    /// Day of the month when the payment is due. Required if periodic.
    /// `None` for non-periodic accounts.
    pub due_day: Option<i64>,
    pub notify: bool,
    pub archived_at: Option<chrono::DateTime<chrono::Utc>>,
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

/// Kind of upcoming notification for a periodic account.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationKind {
    /// Sent on the `start_day` — the billing window opens.
    Open,
    /// Sent on the mid-point of the window: `ceil((start + due) / 2)`.
    Middle,
    /// Sent one day before `due_day`.
    DayBefore,
    /// Only used when `start_day == due_day`: five days before the
    /// single payment day.
    FiveDaysBefore,
}

/// A pre-computed upcoming notification for a periodic account.
///
/// `date` is the exact day when the notification would fire.
/// `crosses_month` is `true` when `date` falls in a different calendar
/// month than the actual payment cycle (only happens for `DayBefore` or
/// `FiveDaysBefore` on very early `due_day` values).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NextNotification {
    pub kind: NotificationKind,
    pub date: NaiveDate,
    pub crosses_month: bool,
}

/// A monthly billing cycle reminder derived from an active periodic account.
///
/// `due_date` points to the *next relevant* payment date for this account,
/// which advances automatically to the following month if the current
/// month's cycle is either paid or has already passed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub account_id: String,
    pub name: String,
    pub account_type: AccountType,
    pub start_day: i64,
    pub due_day: i64,
    /// The next relevant due date. Advances to next month automatically
    /// when the current cycle is paid or already elapsed and unpaid.
    pub due_date: NaiveDate,
    /// True if the cycle at `due_date` is paid.
    pub is_paid: bool,
    /// True if the account has any transaction in the current calendar month.
    pub paid_in_current_month: bool,
    /// `payment_date` of the most recent transaction in the current
    /// calendar month, or `None` if there is no payment this month.
    /// Used by the UI to show a "recently paid" section for the last
    /// N days.
    pub paid_at: Option<NaiveDate>,
    /// Next scheduled notification for the cycle at `due_date`.
    pub next_notification: Option<NextNotification>,
}
