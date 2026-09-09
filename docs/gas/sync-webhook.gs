/**
 * Waled — Sync Webhook (Google Apps Script)
 * Sub-entrega 4b.2 — Minimal receiver
 *
 * Receives synchronization events from Waled desktop:
 *   - create_account: register a new periodic account
 *   - update_account: replace an existing account's data
 *   - archive_account: remove an account
 *   - ping: connectivity check, no side-effects
 *
 * State is stored in the script's PropertiesService as a JSON blob
 * keyed by account id. Structure:
 *
 *   {
 *     "a_uuid1": { id, concept, start_day, due_day, notify },
 *     "a_uuid2": { ... }
 *   }
 *
 * In sub-entrega 4b.3 this script will grow to include the daily
 * evaluation trigger and the mark_paid event. For now, it only
 * persists state so the app can validate the sync roundtrip.
 */

const STORE_KEY = "waled_sync_accounts";

/**
 * Entry point for HTTP POST requests. All events land here.
 */
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

/**
 * Upsert an account into the store. Same handler for create and update
 * since PropertiesService semantics are already replace-on-write.
 */
function handleUpsert(payload) {
  if (!payload.id) {
    return jsonResponse(400, { ok: false, error: "payload.id is required" });
  }

  const store = loadStore();
  store[payload.id] = {
    id: payload.id,
    concept: payload.concept,
    start_day: payload.start_day,
    due_day: payload.due_day,
    notify: payload.notify,
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

function loadStore() {
  const raw = PropertiesService.getScriptProperties().getProperty(STORE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function saveStore(store) {
  PropertiesService.getScriptProperties().setProperty(
    STORE_KEY,
    JSON.stringify(store)
  );
}

function jsonResponse(status, body) {
  // Google Apps Script's ContentService doesn't let us set arbitrary
  // HTTP status codes for web apps — they always return 200 unless the
  // script throws. We include the intended status in the body so the
  // client can distinguish success from error semantically.
  const output = ContentService.createTextOutput(
    JSON.stringify(Object.assign({ status: status }, body))
  );
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Utility for inspecting the current stored state from the Apps Script
 * editor. Run manually (Run menu > debugStore) to see what's persisted.
 */
function debugStore() {
  const store = loadStore();
  Logger.log(JSON.stringify(store, null, 2));
}

/**
 * Utility for wiping the store manually. Do NOT expose this via doGet
 * or doPost — it's meant to be run from the editor for cleanup only.
 */
function debugReset() {
  PropertiesService.getScriptProperties().deleteProperty(STORE_KEY);
  Logger.log("Sync store cleared.");
}
