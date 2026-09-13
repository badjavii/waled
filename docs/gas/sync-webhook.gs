/**
 * Waled — Sync Webhook (Google Apps Script)
 * v0.2.0 — Sync events + daily digest trigger
 *
 * This script:
 *   1. Receives sync events from Waled desktop and stores account state
 *      in PropertiesService.
 *   2. Runs a daily trigger at 8:00 AM (America/Caracas) that sends a
 *      single digest email listing all periodic accounts whose due date
 *      falls within the next 7 days and are not yet paid this month.
 *
 * State stored in PropertiesService under key `waled_sync_accounts`:
 *
 *   {
 *     "a_uuid": {
 *       id: "a_uuid",
 *       concept: "Netflix",
 *       start_day: 1,
 *       due_day: 15,
 *       notify: true,
 *       is_paid: false,       // reset every 1st of the month
 *       user_email: "..."     // captured from mark_paid or account events
 *     }
 *   }
 *
 * Also stored: `waled_user_email` — the latest email seen from any event,
 * used as fallback destination for the daily digest.
 */

const STORE_KEY = "waled_sync_accounts";
const EMAIL_KEY = "waled_user_email";
const TIMEZONE = "America/Caracas";
const UPCOMING_WINDOW_DAYS = 7;

// ============================================================================
// HTTP entry point
// ============================================================================

function doPost(e) {
  try {
    const raw = e.postData && e.postData.contents;
    if (!raw) {
      return jsonResponse(400, { ok: false, error: "empty request body" });
    }

    const envelope = JSON.parse(raw);
    const eventType = envelope.type;
    const payload = envelope.payload || {};

    switch (eventType) {
      case "ping":
        return jsonResponse(200, { ok: true, service: "waled-sync" });
      case "create_account":
      case "update_account":
        return handleUpsert(payload);
      case "archive_account":
        return handleArchive(payload);
      case "mark_paid":
        return handleMarkPaid(payload);
      case "full_resync":
        return handleFullResync(payload);
      default:
        return jsonResponse(400, {
          ok: false,
          error: "unknown event type: " + eventType,
        });
    }
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: "unhandled exception: " + (err && err.message ? err.message : String(err)),
    });
  }
}

// ============================================================================
// Event handlers
// ============================================================================

function handleUpsert(payload) {
  if (!payload.id) {
    return jsonResponse(400, { ok: false, error: "payload.id is required" });
  }

  const store = loadStore();
  const existing = store[payload.id] || {};
  store[payload.id] = {
    id: payload.id,
    concept: payload.concept,
    start_day: payload.start_day,
    due_day: payload.due_day,
    notify: payload.notify,
    is_paid: existing.is_paid || false,
  };
  saveStore(store);

  return jsonResponse(200, { ok: true, id: payload.id });
}

function handleArchive(payload) {
  if (!payload.id) {
    return jsonResponse(400, { ok: false, error: "payload.id is required" });
  }

  const store = loadStore();
  delete store[payload.id];
  saveStore(store);

  return jsonResponse(200, { ok: true, id: payload.id });
}

function handleMarkPaid(payload) {
  if (!payload.account_id) {
    return jsonResponse(400, { ok: false, error: "payload.account_id is required" });
  }

  const store = loadStore();
  const account = store[payload.account_id];
  if (!account) {
    // Account not synced yet — accept but no-op. Waled will call full_resync
    // in a future release to reconcile.
    return jsonResponse(200, { ok: true, ignored: true, reason: "account not found in sync store" });
  }

  account.is_paid = true;
  store[payload.account_id] = account;
  saveStore(store);

  return jsonResponse(200, { ok: true, account_id: payload.account_id });
}

/**
 * Replace the entire sync store with the provided snapshot of accounts.
 * Called after a Waled import or wipe to bring GAS back in line with
 * local state.
 */
function handleFullResync(payload) {
  if (!Array.isArray(payload.accounts)) {
    return jsonResponse(400, {
      ok: false,
      error: "payload.accounts must be an array",
    })
  }

  var store = {};
  payload.accounts.forEach(function (account) {
    if (!account.id) return;
    store[account.id] = {
      id: account.id,
      concept: account.concept,
      start_day: account.start_day,
      due_day: account.due_day,
      notify: account.notify,
      is_paid: account.is_paid || false,
    };
  });

  saveStore(store);
  return jsonResponse(200, { ok: true, count: payload.accounts.length });
}

// ============================================================================
// Daily digest trigger
// ============================================================================

/**
 * Main trigger function. Runs daily at 8am Caracas.
 * 1. If today is the 1st, reset is_paid for all accounts.
 * 2. Collect accounts whose due_date is within the next 7 days AND
 *    notify=true AND is_paid=false.
 * 3. If any, send a single digest email.
 */
function runDailyDigest() {
  const store = loadStore();
  const today = new Date();
  const todayInTz = new Date(today.toLocaleString("en-US", { timeZone: TIMEZONE }));

  // Reset paid flags on the 1st of the month.
  if (todayInTz.getDate() === 1) {
    resetPaidFlags(store);
  }

  const upcoming = collectUpcoming(store, todayInTz);
  if (upcoming.length === 0) {
    Logger.log("No upcoming payments today. Skipping digest.");
    return;
  }

  const userEmail = getUserEmail();
  if (!userEmail) {
    Logger.log("No user email configured. Skipping digest.");
    return;
  }

  sendDigestEmail(userEmail, upcoming);
  Logger.log("Digest sent to " + userEmail + " with " + upcoming.length + " reminders.");
}

function resetPaidFlags(store) {
  var changed = false;
  for (var id in store) {
    if (store[id].is_paid) {
      store[id].is_paid = false;
      changed = true;
    }
  }
  if (changed) {
    saveStore(store);
    Logger.log("Reset is_paid for all accounts (new month).");
  }
}

function collectUpcoming(store, today) {
  var result = [];
  for (var id in store) {
    var account = store[id];
    if (!account.notify || account.is_paid) continue;

    var dueDate = resolveDueDate(today, account.due_day);
    var daysUntil = daysBetween(today, dueDate);

    if (daysUntil < 0) continue;
    if (daysUntil <= UPCOMING_WINDOW_DAYS) {
      result.push({
        concept: account.concept,
        dueDate: dueDate,
        daysUntil: daysUntil,
      });
    }
  }
  result.sort(function (a, b) { return a.daysUntil - b.daysUntil; });
  return result;
}

function resolveDueDate(today, dueDay) {
  // Try current month first.
  var year = today.getFullYear();
  var month = today.getMonth();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var clampedDay = Math.min(dueDay, daysInMonth);
  var candidate = new Date(year, month, clampedDay);

  if (candidate >= stripTime(today)) return candidate;

  // Past due — advance to next month.
  var nextYear = month === 11 ? year + 1 : year;
  var nextMonth = (month + 1) % 12;
  var nextDaysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  var nextClampedDay = Math.min(dueDay, nextDaysInMonth);
  return new Date(nextYear, nextMonth, nextClampedDay);
}

function daysBetween(from, to) {
  var fromMidnight = stripTime(from);
  var toMidnight = stripTime(to);
  var diffMs = toMidnight.getTime() - fromMidnight.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ============================================================================
// Email
// ============================================================================

function sendDigestEmail(recipient, upcoming) {
  var subject = "Waled · Recordatorio diario (" + upcoming.length +
    (upcoming.length === 1 ? " pago próximo)" : " pagos próximos)");

  var html = buildDigestHtml(upcoming);
  var plainText = buildDigestPlainText(upcoming);

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: plainText,
    htmlBody: html,
  });
}

function buildDigestPlainText(upcoming) {
  var lines = ["Tienes " + upcoming.length + " pagos próximos:\n"];
  upcoming.forEach(function (item) {
    lines.push("- " + item.concept + " (" + formatDate(item.dueDate) + ")");
  });
  lines.push("\nEste correo se envió automáticamente desde tu instancia de Waled.");
  return lines.join("\n");
}

function buildDigestHtml(upcoming) {
  var rows = upcoming.map(function (item) {
    return '<tr>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #e6e8eb;">' +
        '<div style="font-size:14px;font-weight:600;color:#1a1d24;">' +
          escapeHtml(item.concept) +
        '</div>' +
      '</td>' +
      '<td style="padding:12px 16px;border-bottom:1px solid #e6e8eb;text-align:right;white-space:nowrap;">' +
        '<div style="font-size:13px;color:#4a5060;font-family:Menlo,monospace;">' +
          escapeHtml(formatDate(item.dueDate)) +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

  return '' +
'<!DOCTYPE html>' +
'<html><head><meta name="color-scheme" content="light"><meta charset="utf-8"></head>' +
'<body style="margin:0;padding:24px 12px;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">' +
  '<table role="presentation" style="max-width:500px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e6e8eb;width:100%;">' +
    '<tr>' +
      '<td style="padding:20px 20px 12px 20px;">' +
        '<div style="font-size:12px;color:#8b93a3;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Waled</div>' +
        '<div style="font-size:17px;color:#1a1d24;font-weight:700;margin-top:4px;">Recordatorio diario</div>' +
        '<div style="font-size:13px;color:#4a5060;margin-top:8px;">' +
          'Tienes <strong>' + upcoming.length + '</strong> ' +
          (upcoming.length === 1 ? 'pago próximo' : 'pagos próximos') +
          ' esta semana.' +
        '</div>' +
      '</td>' +
    '</tr>' +
    '<tr><td style="padding:0 20px 8px 20px;"><table role="presentation" style="width:100%;">' + rows + '</table></td></tr>' +
    '<tr>' +
      '<td style="padding:12px 20px 20px 20px;">' +
        '<div style="font-size:11px;color:#8b93a3;">Enviado automáticamente por tu instancia de Waled.</div>' +
      '</td>' +
    '</tr>' +
  '</table>' +
'</body></html>';
}

function formatDate(date) {
  var months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// Persistence
// ============================================================================

function loadStore() {
  var raw = PropertiesService.getScriptProperties().getProperty(STORE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveStore(store) {
  PropertiesService.getScriptProperties().setProperty(
    STORE_KEY, JSON.stringify(store)
  );
}

function getUserEmail() {
  return PropertiesService.getScriptProperties().getProperty(EMAIL_KEY);
}

function setUserEmail(email) {
  if (email && String(email).trim().length > 0) {
    PropertiesService.getScriptProperties().setProperty(EMAIL_KEY, email);
  }
}

// ============================================================================
// HTTP response helper
// ============================================================================

function jsonResponse(status, body) {
  var output = ContentService.createTextOutput(
    JSON.stringify(Object.assign({ status: status }, body))
  );
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================================
// Debug utilities (run from editor manually)
// ============================================================================

function debugStore() {
  Logger.log(JSON.stringify(loadStore(), null, 2));
}

function debugEmail() {
  Logger.log("Stored user email: " + getUserEmail());
}

function debugRunDigest() {
  runDailyDigest();
}

function debugReset() {
  PropertiesService.getScriptProperties().deleteProperty(STORE_KEY);
  Logger.log("Sync store cleared.");
}
