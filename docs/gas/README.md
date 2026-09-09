# Waled — Google Apps Script Scripts

Waled uses two Google Apps Script (GAS) deployments to operate:

1. **Reminder webhook**: receives "Send now" triggers from the app and dispatches emails with the reminder digest.
2. **Sync webhook**: receives synchronization events when the user creates, updates, or archives periodic accounts, or registers a payment.

Each user deploys **their own scripts** under their personal Google account. Waled does not host any shared service.

## Deploying the Sync Webhook (v0.2.0)

### 1. Create the project

- Go to [script.google.com](https://script.google.com).
- Click **New project**.
- Rename the project to "Waled Sync" (optional, for your own reference).

### 2. Paste the code

- Delete the default content of `Code.gs`.
- Copy and paste the contents of [`sync-webhook.gs`](./sync-webhook.gs).
- Save with Ctrl+S (or Cmd+S).

### 3. Deploy as Web App

- Go to **Deploy → New deployment**.
- Click the gear icon next to "Select type" and choose **Web app**.
- Configuration:
  - **Description**: Waled Sync v0.2.0 (optional).
  - **Execute as**: Me.
  - **Who has access**: Anyone.
- Click **Deploy**.
- Authorize the permissions Google requests (the script needs access to PropertiesService).
- Copy the **Web app URL**: this is the one you'll paste into Waled.

### 4. Configure in Waled

- Open Waled → Settings → **Webhooks** tab.
- Paste the URL into the **Sync Webhook (GAS)** field.
- Click **Test** to verify the connection.
- Save.

From now on, whenever you create, update, or archive periodic accounts in Waled, the state will be automatically synchronized with this script.

## About `PropertiesService`

The script stores synchronized account state in `PropertiesService` — the persistent storage layer of Apps Script. It's a limited space (500 KB total per script) but more than enough for typical periodic account setups.

To inspect the stored state:
- Open the script in the Apps Script editor.
- Select the `debugStore` function from the top dropdown.
- Click **Run**. The state appears in the log panel (Ctrl+Enter).

To manually wipe the state (for example, if you want to re-sync from scratch):
- Select the `debugReset` function and run it.

## Future updates

In upcoming versions of Waled, the script will grow to include:
- A daily trigger that evaluates which emails to send based on the rules in spec §3.
- A `mark_paid` event to suspend reminders when a payment is registered.
- A `full_resync` event to restore state after importing a backup.

When you update Waled, check this README to see whether you need to update your script as well.

## Reminder Webhook (v0.1.1)

The reminder webhook script comes from v0.1.1 and continues to work without changes. Its code isn't versioned here because it hasn't changed — keep the one you already have deployed.
