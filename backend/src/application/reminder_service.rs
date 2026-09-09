//! Reminder derivation for periodic accounts using monthly billing windows.

use std::sync::Arc;

use chrono::{Datelike, Duration, Local, NaiveDate};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::{NextNotification, NotificationKind, Reminder};
use crate::domain::ports::{
    AccountRepository, NotificationSender, ReminderNotificationKind,
    ReminderNotificationPayload, SettingsRepository, TransactionRepository,
};

pub struct ReminderService {
    accounts: Arc<dyn AccountRepository>,
    transactions: Arc<dyn TransactionRepository>,
    settings: Arc<dyn SettingsRepository>,
    notifier: Arc<dyn NotificationSender>,
}

impl ReminderService {
    #[must_use]
    pub fn new(
        accounts: Arc<dyn AccountRepository>,
        transactions: Arc<dyn TransactionRepository>,
        settings: Arc<dyn SettingsRepository>,
        notifier: Arc<dyn NotificationSender>,
    ) -> Self {
        Self { accounts, transactions, settings, notifier }
    }

    /// Compute reminders. Each reminder points to the next relevant due
    /// date for its account, which may fall in the current or the next
    /// calendar month depending on whether the current cycle is elapsed
    /// or paid.
    pub fn upcoming(&self, today: NaiveDate) -> DomainResult<Vec<Reminder>> {
        let mut reminders = Vec::new();

        for account in self.accounts.list_active_periodic()? {
            let Some(start_day) = account.start_day else { continue };
            let Some(due_day) = account.due_day else { continue };

            let paid_at = self.latest_payment_in_month(&account.id, today)?;
            let paid_in_current_month = paid_at.is_some();

            let current_due = resolve_due_date(today, due_day);
            let use_next_month = paid_in_current_month;

            let (target_due, target_start_day, target_due_day) = if use_next_month {
                let next_month_today = shift_to_next_month_start(today);
                (
                    resolve_due_date(next_month_today, due_day),
                    start_day,
                    due_day,
                )
            } else {
                (current_due, start_day, due_day)
            };

            let cycle_is_paid = !use_next_month && paid_in_current_month;

            let next_notification = compute_next_notification_for_cycle(
                today,
                target_due,
                target_start_day,
                target_due_day,
                cycle_is_paid,
            );

            reminders.push(Reminder {
                account_id: account.id.clone(),
                name: account.name.clone(),
                account_type: account.account_type,
                start_day: target_start_day,
                due_day: target_due_day,
                due_date: target_due,
                is_paid: cycle_is_paid,
                paid_in_current_month,
                paid_at,
                next_notification,
            });
        }

        reminders.sort_by(|a, b| a.due_date.cmp(&b.due_date));
        Ok(reminders)
    }

    pub async fn send_digest(
        &self,
        today: NaiveDate,
        kind: ReminderNotificationKind,
    ) -> DomainResult<ReminderNotificationPayload> {
        let settings = self.settings.load()?;
        if settings.gas_reminder_webhook_url.trim().is_empty() {
            return Err(DomainError::Validation(
                "gas_webhook_url is not configured".into(),
            ));
        }
        let reminders = self.upcoming(today)?;

        let payload = ReminderNotificationPayload {
            kind,
            user_name: settings.user_name.clone(),
            user_email: settings.user_email.clone(),
            generated_at: chrono::Utc::now(),
            reminders,
            total_ves: 0.0,
        };
        self.notifier
            .send_reminder(&settings.gas_reminder_webhook_url, &payload)
            .await?;
        Ok(payload)
    }

    /// Send a minimal payload to the reminder webhook to verify connectivity.
    /// The receiving Google Apps Script should acknowledge with 2xx and
    /// take no action (no email is expected).
    ///
    /// # Errors
    ///
    /// Returns [`DomainError::Validation`] if the webhook URL is not set,
    /// or [`DomainError::External`] if the webhook does not respond
    /// successfully within the notifier's timeout.
    pub async fn ping(&self, url_override: Option<String>) -> DomainResult<()> {
        let settings = self.settings.load()?;
        let url = match url_override {
            Some(u) if !u.trim().is_empty() => u.trim().to_string(),
            _ => {
                let stored = settings.gas_reminder_webhook_url.trim();
                if stored.is_empty() {
                    return Err(DomainError::Validation(
                        "gas_webhook_url is not configured".into(),
                    ));
                }
                stored.to_string()
            }
        };

        let payload = ReminderNotificationPayload {
            kind: ReminderNotificationKind::Ping,
            user_name: settings.user_name.clone(),
            user_email: settings.user_email.clone(),
            generated_at: chrono::Utc::now(),
            reminders: Vec::new(),
            total_ves: 0.0,
        };

        self.notifier.send_reminder(&url, &payload).await?;
        Ok(())
    }

    /// Return the most recent transaction's `payment_date` for the given
    /// account within the current calendar month, or `None` if there is
    /// no transaction this month.
    fn latest_payment_in_month(
        &self,
        account_id: &str,
        today: NaiveDate,
    ) -> DomainResult<Option<NaiveDate>> {
        let (month_start, month_end) = month_bounds(today);
        let latest = self
            .transactions
            .list_by_account(account_id)?
            .into_iter()
            .filter(|tx| tx.payment_date >= month_start && tx.payment_date <= month_end)
            .map(|tx| tx.payment_date)
            .max();
        Ok(latest)
    }
}

fn days_in_month(today: NaiveDate) -> u32 {
    let year = today.year();
    let month = today.month();
    let (next_year, next_month) = if month == 12 {
        (year + 1, 1)
    } else {
        (year, month + 1)
    };
    let first_next = NaiveDate::from_ymd_opt(next_year, next_month, 1).unwrap();
    let last_this = first_next - Duration::days(1);
    last_this.day()
}

fn month_bounds(today: NaiveDate) -> (NaiveDate, NaiveDate) {
    let year = today.year();
    let month = today.month();
    let first = NaiveDate::from_ymd_opt(year, month, 1).unwrap();
    let last = NaiveDate::from_ymd_opt(year, month, days_in_month(today)).unwrap();
    (first, last)
}

fn resolve_due_date(anchor: NaiveDate, due_day: i64) -> NaiveDate {
    let month_length = days_in_month(anchor);
    let clamped_day = (due_day as u32).min(month_length);
    NaiveDate::from_ymd_opt(anchor.year(), anchor.month(), clamped_day).unwrap()
}

fn shift_to_next_month_start(today: NaiveDate) -> NaiveDate {
    let (year, month) = if today.month() == 12 {
        (today.year() + 1, 1)
    } else {
        (today.year(), today.month() + 1)
    };
    NaiveDate::from_ymd_opt(year, month, 1).unwrap()
}

fn middle_day(start_day: i64, due_day: i64) -> i64 {
    (start_day + due_day + 1) / 2
}

fn same_month_date(anchor: NaiveDate, day: i64) -> Option<NaiveDate> {
    let month_length = days_in_month(anchor);
    if day < 1 || day as u32 > month_length {
        return None;
    }
    NaiveDate::from_ymd_opt(anchor.year(), anchor.month(), day as u32)
}

fn last_day_of_previous_month(anchor: NaiveDate) -> NaiveDate {
    let first_of_current = NaiveDate::from_ymd_opt(anchor.year(), anchor.month(), 1).unwrap();
    first_of_current - Duration::days(1)
}

fn compute_next_notification_for_cycle(
    today: NaiveDate,
    target_due: NaiveDate,
    start_day: i64,
    due_day: i64,
    cycle_is_paid: bool,
) -> Option<NextNotification> {
    if cycle_is_paid {
        return None;
    }

    let candidates = notification_candidates_for_cycle(target_due, start_day, due_day);

    candidates
        .into_iter()
        .filter(|c| c.date >= today)
        .min_by_key(|c| c.date)
}

fn notification_candidates_for_cycle(
    target_due: NaiveDate,
    start_day: i64,
    due_day: i64,
) -> Vec<NextNotification> {
    let mut out = Vec::new();
    let anchor = target_due;

    if start_day == due_day {
        let day_before = target_due - Duration::days(1);
        let five_before = target_due - Duration::days(5);

        out.push(NextNotification {
            kind: NotificationKind::FiveDaysBefore,
            date: five_before,
            crosses_month: five_before.month() != target_due.month()
                || five_before.year() != target_due.year(),
        });
        out.push(NextNotification {
            kind: NotificationKind::DayBefore,
            date: day_before,
            crosses_month: day_before.month() != target_due.month()
                || day_before.year() != target_due.year(),
        });
    } else {
        if let Some(date) = same_month_date(anchor, start_day) {
            out.push(NextNotification {
                kind: NotificationKind::Open,
                date,
                crosses_month: false,
            });
        }

        let middle = middle_day(start_day, due_day);
        if middle != start_day && middle != due_day - 1 {
            if let Some(date) = same_month_date(anchor, middle) {
                out.push(NextNotification {
                    kind: NotificationKind::Middle,
                    date,
                    crosses_month: false,
                });
            }
        }

        let day_before = if due_day == 1 {
            last_day_of_previous_month(anchor)
        } else {
            target_due - Duration::days(1)
        };
        out.push(NextNotification {
            kind: NotificationKind::DayBefore,
            date: day_before,
            crosses_month: day_before.month() != target_due.month()
                || day_before.year() != target_due.year(),
        });
    }

    out
}

#[allow(dead_code)]
pub fn today_local() -> NaiveDate {
    Local::now().date_naive()
}
