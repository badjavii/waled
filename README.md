<div align="center">

# Waled

_Offline-first personal expense tracker built for Venezuela_

[![Tech](https://img.shields.io/badge/Tech-Rust%20%7C%20Tauri%20v2-orange?labelColor=181825&style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-blue?labelColor=181825&style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS-06b6d4?labelColor=181825&style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/github/license/Badjavii/waled?color=a6e3a1&labelColor=181825&style=for-the-badge)](https://github.com/Badjavii/waled/blob/main/LICENSE)

</div>

## About Waled

Waled is a desktop application for tracking personal expenses in Venezuela, purpose-built around the country's dual-currency reality. Every expense is recorded in bolívares (VES), and the USD equivalent is derived from the official BCV exchange rate — frozen at the moment of payment so historical values never drift, and recomputed against today's rate on the fly for a current view.

The app is offline-first: a local SQLite database keeps every transaction, wallet and account under the user's control on their own machine. The BCV rate is fetched from DolarApi at startup and refreshed daily at midnight; when offline, the app degrades gracefully, letting the user enter the rate manually. Reminders for upcoming periodic payments are dispatched by email through a user-configured Google Apps Script webhook, keeping the backend free of third-party integrations while giving the user full control of their delivery channel.

Waled deliberately does not track income, balances or transfers. It is an expenses-only tool.

## Features

- Strict expense-only tracking, categorised by account type (utilities, food, education, health, and more).
- Historical BCV rate frozen at payment time, so the USD equivalent of a past expense reflects that day's economic reality.
- Physical and digital wallets, with optional payment references for digital methods.
- Automatic reminders for periodic payments delivered by email through a user-configured webhook — payment dates only, no speculative amounts.
- Live BCV rate widget that refreshes automatically at midnight and manually on demand.
- Monthly dashboard with total expenses, top 5 accounts by cost and top 5 upcoming payments.
- Full JSON export of the local database as a portable backup.
- Dark-mode interface designed for daily desktop use.

## Building & Installation

### Prerequisites

- **Node.js** 20 LTS or later
- **Rust** stable toolchain (installed via [rustup](https://rustup.rs/))
- **System dependencies** for Tauri v2 — see the [Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS

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

- **Linux**: `.AppImage` (portable, no installation required) and `.deb` / `.rpm`
- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` and `.app`

### Prebuilt releases

Signed installers for Windows and Linux are published automatically on every tagged release. Grab the latest from the [Releases page](https://github.com/Badjavii/waled/releases).

## Credits

This project is proudly designed and developed by **Badjavii**, junior developer.
