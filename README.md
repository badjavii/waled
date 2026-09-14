<div align="center">

# Waled

_Personal expense tracker built for Venezuela_

[![Tech](https://img.shields.io/badge/Tech-Rust%20%7C%20Tauri%20v2-orange?labelColor=181825&style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue?labelColor=181825&style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS-06b6d4?labelColor=181825&style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/github/license/Badjavii/waled?color=a6e3a1&labelColor=181825&style=for-the-badge)](https://github.com/Badjavii/waled/blob/main/LICENSE)

[Leer este README en español](./docs/es/README.md)

</div>

## About Waled

Waled is a desktop application for tracking personal expenses in Venezuela, purpose-built around the country's dual-currency reality. Every expense is recorded in bolívares (VES). The USD equivalent is derived from the official BCV exchange rate: frozen at the moment of payment so historical values never drift, and recomputed against today's rate on the fly for a current view.

The app runs locally on your machine. A SQLite database keeps every transaction, wallet and account under your own control. The BCV rate is fetched from DolarApi at startup and refreshed daily at midnight. When offline, the app degrades gracefully and lets you enter the rate manually.

Waled deliberately does not track income, balances or transfers. It is an expenses-only tool.

## Reminder and sync architecture

Since v0.2.0, Waled integrates with two user-owned Google Apps Script webhooks that handle reminders and state synchronization:

- **Reminder webhook**: receives the "Send now" trigger from the app and dispatches an on-demand digest email with upcoming payments.
- **Sync webhook**: receives synchronization events every time you create, update, archive or pay a periodic account. It maintains its own state in Google's `PropertiesService` and runs a daily trigger at 8am Caracas time that sends a consolidated digest of upcoming payments, so reminders arrive even when your computer is off.

Each user deploys their own scripts under their personal Google account. Waled does not host any shared service. Setup instructions and the script sources are in [`docs/gas/`](./docs/gas/).

## Features

- Strict expense-only tracking, categorised by account type (utilities, food, education, health, and more).
- Historical BCV rate frozen at payment time, so the USD equivalent of a past expense reflects that day's economic reality.
- Physical and digital wallets, with optional payment references for any type.
- Two-cycle reminders per periodic account (current cycle plus next cycle within a 30-day window), shown in three sections: upcoming, overdue and recently paid.
- Daily digest email dispatched automatically by Google Apps Script at 8am Caracas time.
- Manual "Send now" button that fires an on-demand digest without waiting for the daily trigger.
- Strict-online sync of periodic accounts and payments to the sync webhook when configured. Reject-and-retry on network failure keeps local and remote state aligned.
- Live BCV rate widget that refreshes automatically at midnight and manually on demand.
- Monthly dashboard with total expenses, top 5 accounts by cost and top 5 upcoming payments.
- Full JSON export and import of the local database with schema-version validation.
- Configurable backups directory with auto-created subtree for manual, import and wipe backups.
- Application reset (wipe) protected by name-typing confirmation and automatic pre-wipe backup.
- Dark-mode interface designed for daily desktop use.

## Building and installation

### Prerequisites

- **Node.js** 20 LTS or later.
- **Rust** stable toolchain, installed via [rustup](https://rustup.rs/).
- **System dependencies** for Tauri v2. See the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS.

### Clone and set up

```bash
git clone https://github.com/Badjavii/waled.git
cd waled

# Install root orchestrator dependencies
npm install

# Install frontend dependencies
npm install --prefix frontend
```

### Development

```bash
npm run dev
```

This launches Vite for the frontend, compiles the Rust backend in debug mode, and opens the native window with hot reload for UI changes.

### Production build

```bash
npm run build
```

Produces a native installer for the current platform under `backend/target/release/bundle/`:

- **Linux**: `.AppImage` (portable, no installation required) plus `.deb` and `.rpm`.
- **Windows**: `.msi` and `.exe` installers.
- **macOS**: `.dmg` and `.app`.

### Prebuilt releases

Signed installers for Windows and Linux are published automatically on every tagged release. Grab the latest from the [Releases page](https://github.com/Badjavii/waled/releases).

### Google Apps Script setup

To enable the reminder and sync features, deploy the two scripts in [`docs/gas/`](./docs/gas/) under your own Google account and paste their URLs into Waled's settings. Full step-by-step instructions are in the [GAS README](./docs/gas/README.md).

## Credits

This project is proudly designed and developed by **Badjavii**, junior developer.