//! Tauri IPC surface.

use std::path::PathBuf;

use chrono::{Local, NaiveDate};
use serde::Deserialize;
use tauri::State;

use crate::domain::errors::DomainError;
use crate::domain::models::{Account, AccountType, BcvRate, Reminder, Settings, Transaction, Wallet};
use crate::domain::ports::ReminderNotificationKind;
use crate::state::AppState;
use crate::application::export_service::ExportService;

type CommandResult<T> = Result<T, String>;

/// Serialize a domain error into a string prefixed with its variant name.
/// The frontend detects specific variants (like NetworkRequired) by
/// checking the prefix. Never change existing prefixes without also
/// updating the frontend's `parseDomainError` helper.
fn map_error(err: DomainError) -> String {
    match err {
        DomainError::Validation(msg) => format!("Validation: {msg}"),
        DomainError::NotFound(msg) => format!("NotFound: {msg}"),
        DomainError::Persistence(msg) => format!("Persistence: {msg}"),
        DomainError::NetworkRequired(msg) => format!("NetworkRequired: {msg}"),
        DomainError::Conflict(msg) => format!("Conflict: {msg}"),
        DomainError::Notification(msg) => format!("Notification: {msg}"),
        DomainError::Unexpected(msg) => format!("Unexpected: {msg}"),
    }
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
    pub start_day: Option<i64>,
    pub due_day: Option<i64>,
    pub notify: bool,
}

#[tauri::command]
pub fn list_accounts(state: State<'_, AppState>) -> CommandResult<Vec<Account>> {
    state.accounts.list_active().map_err(map_error)
}

#[tauri::command]
pub fn list_all_accounts(state: State<'_, AppState>) -> CommandResult<Vec<Account>> {
    state.accounts.list_all().map_err(map_error)
}

#[tauri::command]
pub async fn create_account(
    state: State<'_, AppState>,
    input: AccountInput,
) -> CommandResult<Account> {
    state
        .accounts
        .create(
            input.name,
            input.description,
            input.account_type,
            input.is_periodic,
            input.start_day,
            input.due_day,
            input.notify,
        )
        .await
        .map_err(map_error)
}

#[tauri::command]
pub async fn update_account(
    state: State<'_, AppState>,
    account: Account,
) -> CommandResult<Account> {
    state.accounts.update(account).await.map_err(map_error)
}

#[tauri::command]
pub async fn delete_account(state: State<'_, AppState>, id: String) -> CommandResult<()> {
    state.accounts.archive(&id).await.map_err(map_error)
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
pub async fn create_transaction(
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
        .await
        .map_err(map_error)
}

#[tauri::command]
pub fn update_transaction(
    state: State<'_, AppState>,
    id: String,
    input: TransactionInput,
) -> CommandResult<Transaction> {
    // Read the existing record to preserve `created_at` (audit field
    // that should never be mutated by user edits).
    let existing = state.transactions.get(&id).map_err(map_error)?;
    let transaction = Transaction {
        id: existing.id,
        account_id: input.account_id,
        wallet_id: input.wallet_id,
        ves_amount: input.ves_amount,
        payment_date: input.payment_date,
        created_at: existing.created_at,
        description: input.description,
        payment_reference: input.payment_reference,
        bcv_rate_at_payment: input.bcv_rate_at_payment,
    };
    state
        .transactions
        .update(transaction)
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

#[tauri::command]
pub async fn ping_sync_webhook(
    state: State<'_, AppState>,
    url: Option<String>,
) -> CommandResult<()> {
    state.reminders.ping(url).await.map_err(map_error)
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

/// Send a lightweight ping to the reminder webhook to verify that the
/// URL is reachable and that Google Apps Script responds. Does not send
/// any email; used by the "Probar conexión" button in Settings.
#[tauri::command]
pub async fn ping_reminder_webhook(
    state: State<'_, AppState>,
    url: Option<String>,
) -> CommandResult<()> {
    state.reminders.ping(url).await.map_err(map_error)
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

#[tauri::command]
pub fn configure_backups_directory(
    state: State<'_, AppState>,
    directory: String,
) -> CommandResult<Settings> {
    let path = PathBuf::from(directory.trim());
    if path.as_os_str().is_empty() {
        return Err(map_error(DomainError::Validation(
            "backups directory cannot be empty".into(),
        )));
    }

    // Create the waled-backups/ subtree. If this fails (no permissions,
    // path doesn't exist, etc.), abort before touching settings.
    ExportService::ensure_backup_structure(&path).map_err(map_error)?;

    // Persist the choice in settings.
    let mut settings = state.settings.load().map_err(map_error)?;
    settings.backups_directory = path.to_string_lossy().to_string();
    state.settings.save(settings).map_err(map_error)?;
    state.settings.load().map_err(map_error)
    }
