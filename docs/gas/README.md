# Waled — Google Apps Script Scripts

Waled uses two Google Apps Script (GAS) deployments to operate:

1. **Reminder webhook**: receives "Send now" triggers from the app and dispatches emails with the reminder digest.
2. **Sync webhook**: receives synchronization events when the user creates, updates, or archives periodic accounts, or registers a payment. Also runs a daily trigger that emails a digest of upcoming payments.

Each user deploys **their own scripts** under their personal Google account. Waled does not host any shared service.

---

## Setup Overview (Sync Webhook v0.2.0)

Setting up the sync webhook is a three-phase process:

1. **[Deploy the script](#phase-1-deploy-the-script)** as a Web App and connect it to Waled.
2. **[Configure the script](#phase-2-configure-the-script)** with your email address and timezone.
3. **[Enable the daily trigger](#phase-3-enable-the-daily-trigger)** to receive automatic reminders.

Follow the phases in order. Once complete, Waled will automatically sync periodic account changes to the script, and the script will email you a daily digest of upcoming payments.

---

## Phase 1: Deploy the script

### 1.1 Create the project

- Go to [script.google.com](https://script.google.com).
- Click **New project**.
- Rename the project to "Waled Sync" (optional, for your own reference).

### 1.2 Paste the code

- Delete the default content of `Code.gs`.
- Copy and paste the contents of [`sync-webhook.gs`](./sync-webhook.gs).
- Save with `Ctrl+S` (or `Cmd+S` on macOS).

### 1.3 Deploy as Web App

- Go to **Deploy → New deployment**.
- Click the gear icon next to "Select type" and choose **Web app**.
- Configuration:
  - **Description**: `Waled Sync v0.2.0` (optional).
  - **Execute as**: `Me`.
  - **Who has access**: `Anyone`.
- Click **Deploy**.
- Authorize the permissions Google requests. The script needs access to:
  - `PropertiesService` — persistent storage for account state.
  - `MailApp` — sending the daily digest emails.
- Copy the **Web app URL**. This is what you'll paste into Waled.

> The `Who has access` setting **must** be `Anyone`. If you leave it as `Anyone with Google account` or `Only myself`, Waled won't be able to reach the script and you'll see a login page in the error details.

### 1.4 Configure in Waled

- Open Waled → Settings → **Webhooks** tab.
- Paste the URL into the **Sync Webhook (GAS)** field.
- Click **Test** to verify the connection. You should see a green toast.
- **Save**.

From now on, whenever you create, update, or archive periodic accounts in Waled, the state is automatically synchronized with the script.

---

## Phase 2: Configure the script

### 2.1 Set the timezone

The daily trigger runs at 8 AM in your project's configured timezone. Make sure it matches your location:

- In the editor, go to **Project Settings** (gear icon on the left sidebar).
- Under **General settings**, find **Time zone** and set it to `(GMT-04:00) Caracas` (or your local zone).
- Save.

If you skip this step, the digest may arrive at unexpected hours.

### 2.2 Set your email address

The script needs to know where to send the daily digest.

**Option A — via Script Properties (recommended)**:

1. In the editor, go to **Project Settings** (gear icon on the left sidebar).
2. Scroll down to **Script Properties** and click **Edit script properties**.
3. Add a new property:
   - **Property**: `waled_user_email`
   - **Value**: your email address
4. Save.

**Option B — via the code editor**:

1. Select the `setUserEmail` function from the top dropdown.
2. Temporarily edit the function to hardcode your email:
```javascript
   function setUserEmail(email) {
     if (!email) email = "your@email.com";
     // ...rest of code...
   }
```
3. Click **Run**. Authorize permissions if prompted.
4. Verify by running `debugEmail` — it should log your address.
5. **Revert the hardcoded change** so your email doesn't stay in the code.

---

## Phase 3: Enable the daily trigger

1. In the editor, go to the **Triggers** menu (clock icon on the left sidebar).
2. Click **Add Trigger** (bottom right corner).
3. Configuration:
    - **Choose which function to run**: `runDailyDigest`
    - **Choose which deployment should run**: `Head`
    - **Select event source**: `Time-driven`
    - **Select type of time based trigger**: `Day timer`
    - **Select time of day**: `8am to 9am` (or your preferred window)
4. Click **Save**.

The digest will now be sent automatically every morning if there are any upcoming payments in the next 7 days.

---

## Testing the digest

You don't need to wait until 8 AM tomorrow to verify the digest works:

1. Make sure you have at least one periodic account in Waled with `notify` enabled and a `due_date` in the next 7 days.
2. In the Apps Script editor, select `debugRunDigest` from the top dropdown.
3. Click **Run**. If everything is configured, you should receive the digest email within a few seconds.

Check the execution log if nothing arrives — it will tell you if the email was skipped and why.

---

## Debug utilities

The script exposes four utility functions you can run manually from the editor:

| Function | What it does |
|---|---|
| `debugStore` | Logs the current state of synced accounts. |
| `debugEmail` | Logs the configured user email. |
| `debugRunDigest` | Manually triggers the daily digest (same as the scheduled run). |
| `debugReset` | Wipes all stored account state. Use with caution. |

To run one, select it in the top dropdown of the editor and click **Run**. View the output in the execution log (`View → Executions` or `Ctrl+Enter`).

---

## Troubleshooting

**"Test" in Waled shows a red toast with a login page snippet**

The Web App is deployed with the wrong access level. Go back to **Deploy → Manage deployments**, edit the deployment, and set **Who has access** to `Anyone`. Then update the URL in Waled if the deployment ID changed.

**The digest never arrives**

Check in this order:

1. Is the timezone in Project Settings set correctly? A wrong timezone can shift the trigger by hours.
2. Is the trigger actually scheduled? Go to the Triggers panel — you should see `runDailyDigest` listed with a Day timer.
3. Is `waled_user_email` set? Run `debugEmail` to verify.
4. Are there actually accounts due within the next 7 days? Run `debugStore` to inspect the sync state — check that at least one account has `notify: true`, `is_paid: false`, and a `due_day` matching soon.
5. Run `debugRunDigest` manually and check the execution log for skip reasons.

**"Your daily quota has been reached" error**

Google Apps Script free accounts have a limit of **100 emails per day** through `MailApp`. Since the digest is a single email per day, hitting this limit only happens if you're using the script for other purposes. Google Workspace accounts have a higher limit of 1500/day.

**I want to re-sync all accounts from scratch**

1. Run `debugReset` in the script editor to wipe the sync state.
2. In Waled, the next time you create, update, or archive a periodic account, the change will re-sync to the script.
3. Note: existing accounts won't re-sync automatically — they'll be added to the sync state only on their next mutation. A `full_resync` event that pushes all accounts at once is planned for Waled Entrega 5 (import/wipe workflows).

---

## About `PropertiesService`

The script stores account state in `PropertiesService`, the persistent key-value store of Apps Script. It's limited to 500 KB per script, which comfortably fits hundreds of periodic accounts.

The state is scoped to the script owner — no one else can read it, not even Waled directly. The script is the only component that decides which emails to send and when.

---

## Reminder Webhook (v0.1.1)

The reminders webhook script is from version v0.1.1 and continues to function without changes. Its operation is not covered in this documentation because it has undergone no modifications and requires no configuration; simply consult the [code](./remider-webhook.gs) within this directory and deploy it.
