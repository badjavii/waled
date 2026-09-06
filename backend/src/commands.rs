//! Tauri IPC surface.

use std::path::PathBuf;

use chrono::{Local, NaiveDate};
use serde::Deserialize;
use tauri::State;

use crate::domain::errors::DomainError;
use crate::domain::models::{Account, AccountType, BcvRate, Reminder, Settings, Transaction, Wallet};
use crate::domain::ports::ReminderNotificationKind;
use crate::state::AppState;

type CommandResult<T> = Result<T, String>;

fn map_error(error: DomainError) -> String {
    error.to_string()
}

// ---------- Wallets ----------

#[derive(Debug, Deserialize)]
pub struct WalletInput {
    pub name: String,
    pub description: String,
    pub is_digital: bool,
}

#[tauri::command]
pub fn list_wallets(state: State<'_, AppState>) -> CommandResult<Vec<Wallet>> {
    state.wallets.list_active().map_err(map_error)
}

#[tauri::command]
pub fn create_wallet(state: State<'_, AppState>, input: WalletInput) -> CommandResult<Wallet> {
    state
        .wallets
        .create(input.name, input.description, input.is_digital)
        .map_err(map_error)
}

#[tauri::command]
pub fn update_wallet(state: State<'_, AppState>, wallet: Wallet) -> CommandResult<Wallet> {
    state.wallets.update(wallet).map_err(map_error)
}

#[tauri::command]
pub fn delete_wallet(state: State<'_, AppState>, id: String) -> CommandResult<()> {
        state.wallets.archive(&id).map_err(map_error)
}

/// List all wallets including archived ones. Used by read-only views
/// (transactions history, details modals) to hydrate wallet names for
/// records that reference archived wallets.
#[tauri::command]
pub fn list_all_wallets(state: State<'_, AppState>) -> CommandResult<Vec<Wallet>> {
    state.wallets.list_all().map_err(map_error)
}

// ---------- Accounts ----------

#[derive(Debug, Deserialize)]
pub struct AccountInput {
    pub name: String,
    pub description: String,
    pub account_type: AccountType,
    pub is_periodic: bool,
    pub periodicity_days: Option<i64>,
    pub notify: bool,
}

#[tauri::command]
pub fn list_accounts(state: State<'_, AppState>) -> CommandResult<Vec<Account>> {
    state.accounts.list().map_err(map_error)
}

#[tauri::command]
pub fn create_account(state: State<'_, AppState>, input: AccountInput) -> CommandResult<Account> {
    state
        .accounts
        .create(
            input.name,
            input.description,
            input.account_type,
            input.is_periodic,
            input.periodicity_days,
            input.notify,
        )
        .map_err(map_error)
}

#[tauri::command]
pub fn update_account(state: State<'_, AppState>, account: Account) -> CommandResult<Account> {
    state.accounts.update(account).map_err(map_error)
}

#[tauri::command]
pub fn delete_account(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.accounts.delete(&id).map_err(map_error)
}

// ---------- Transactions ----------

#[derive(Debug, Deserialize)]
pub struct TransactionInput {
    pub account_id: String,
    pub wallet_id: String,
    pub ves_amount: f64,
    pub payment_date: NaiveDate,
    pub description: String,
    pub payment_reference: Option<String>,
    /// Explicit rate the frontend supplies. Comes from the session BCV
    /// state (automatic toggle) or a manual value the user typed
    /// (manual toggle).
    pub bcv_rate_at_payment: f64,
}

#[tauri::command]
pub fn list_transactions(state: State<'_, AppState>) -> CommandResult<Vec<Transaction>> {
    state.transactions.list().map_err(map_error)
}

#[tauri::command]
pub fn create_transaction(
    state: State<'_, AppState>,
    input: TransactionInput,
) -> CommandResult<Transaction> {
    state
        .transactions
        .create(
            input.account_id,
            input.wallet_id,
            input.ves_amount,
            input.payment_date,
            input.description,
            input.payment_reference,
            input.bcv_rate_at_payment,
        )
        .map_err(map_error)
}

#[tauri::command]
pub fn update_transaction(
    state: State<'_, AppState>,
    id: String,
    input: TransactionInput,
) -> CommandResult<Transaction> {
    state
        .transactions
        .update(
            id,
            input.account_id,
            input.wallet_id,
            input.ves_amount,
            input.payment_date,
            input.description,
            input.payment_reference,
            input.bcv_rate_at_payment,
        )
        .map_err(map_error)
}

#[tauri::command]
pub fn delete_transaction(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.transactions.delete(&id).map_err(map_error)
}

// ---------- Settings ----------

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> CommandResult<Settings> {
    state.settings.load().map_err(map_error)
}

#[tauri::command]
pub fn save_settings(state: State<'_, AppState>, settings: Settings) -> CommandResult<Settings> {
    state.settings.save(settings).map_err(map_error)
}

// ---------- BCV (session state) ----------

/// Read the current session BCV rate. `None` when we're offline and no
/// rate has been fetched yet.
#[tauri::command]
pub async fn get_current_bcv_rate(state: State<'_, AppState>) -> CommandResult<Option<BcvRate>> {
    Ok(state.bcv_state.get().await)
}

/// Force a fresh fetch from DolarApi. Useful for a manual "refresh"
/// button in the UI. Returns the new value, or an error string if the
/// upstream is unreachable.
#[tauri::command]
pub async fn refresh_bcv_rate(state: State<'_, AppState>) -> CommandResult<BcvRate> {
    let rate = state
        .bcv_provider
        .fetch_current()
        .await
        .map_err(map_error)?;
    state.bcv_state.set(Some(rate.clone())).await;
    Ok(rate)
}

// ---------- Reminders ----------

#[tauri::command]
pub fn list_reminders(state: State<'_, AppState>) -> CommandResult<Vec<Reminder>> {
    let today = Local::now().date_naive();
    state.reminders.upcoming(today).map_err(map_error)
}

#[tauri::command]
pub async fn trigger_reminder_email(state: State<'_, AppState>) -> CommandResult<()> {
    let today = Local::now().date_naive();
    state
        .reminders
        .send_digest(today, ReminderNotificationKind::Manual)
        .await
        .map(|_| ())
        .map_err(map_error)
}

// ---------- Export ----------

#[tauri::command]
pub async fn export_database(
    state: State<'_, AppState>,
    destination: PathBuf,
) -> CommandResult<PathBuf> {
    let current_rate = state.bcv_state.get().await;
    state
        .exporter
        .write_to_file(&destination, current_rate)
        .map_err(map_error)
}
