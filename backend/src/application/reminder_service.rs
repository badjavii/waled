//! Reminder derivation and email dispatch orchestration.

use std::sync::Arc;

use chrono::{Days, NaiveDate, Utc};

use crate::domain::errors::{DomainError, DomainResult};
use crate::domain::models::Reminder;
use crate::domain::ports::{
    AccountRepository, NotificationSender, ReminderNotificationKind,
    ReminderNotificationPayload, SettingsRepository, TransactionRepository,
};

pub const REMINDER_WINDOW_DAYS: u64 = 21;

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

    pub fn upcoming(&self, today: NaiveDate) -> DomainResult<Vec<Reminder>> {
        let horizon = today
            .checked_add_days(Days::new(REMINDER_WINDOW_DAYS))
            .unwrap_or(today);

        let mut reminders = Vec::new();
        for account in self.accounts.list_periodic()? {
            let Some(periodicity) = account.periodicity_days else { continue };
            let last = self.transactions.last_by_account(&account.id)?;
            let due_date = match &last {
                Some(previous) => previous
                    .payment_date
                    .checked_add_days(Days::new(periodicity as u64))
                    .unwrap_or(today),
                None => today,
            };
            if due_date < today || due_date > horizon {
                continue;
            }
            let estimated = last.map(|tx| tx.ves_amount).unwrap_or_default();
            reminders.push(Reminder {
                account_id: account.id,
                name: account.name,
                account_type: account.account_type,
                due_date,
                periodicity_days: periodicity,
                ves_amount: estimated,
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
        if settings.gas_webhook_url.trim().is_empty() {
            return Err(DomainError::Validation(
                "gas_webhook_url is not configured".into(),
            ));
        }
        let reminders = self.upcoming(today)?;
        let total_ves: f64 = reminders.iter().map(|r| r.ves_amount).sum();

        let payload = ReminderNotificationPayload {
            kind,
            user_name: settings.user_name.clone(),
            user_email: settings.user_email.clone(),
            generated_at: Utc::now(),
            reminders,
            total_ves,
        };
        self.notifier
            .send_reminder(&settings.gas_webhook_url, &payload)
            .await?;
        Ok(payload)
    }
}
