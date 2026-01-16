# Skahl Stats

Automated stats scraper, API wrapper, and Reporting system for the Sno King Adult Hockey League (SKAHL).

## Overview
This project performs two main functions:
1.  **Ingestion**: Bypasses the need for manual login by using a headless browser to retrieve ephemeral tokens, fetches data from the SportNinja API, and syncs it to Google Firestore.
2.  **Stats UI**: A React-based web application (hosted on Firebase) that provides a fast, flat-design interface for players to view team rosters, schedules, and stats.

## Architecture
*   **Ingestion (Backend)**:
    *   **Runtime**: Bun + TypeScript
    *   **Auth**: Puppeteer (Headless Chrome)
    *   **Automation**: GitHub Actions (Scheduled CRON)
*   **Dashboard (Frontend)**:
    *   **Framework**: React + Vite + TypeScript
    *   **Styling**: Tailwind CSS (Flat Design System)
    *   **Hosting**: Firebase Hosting
*   **Database**: Firebase Firestore

## Prerequisites
*   [Bun](https://bun.sh)
*   Firebase CLI

## Local Development

### Backend (Ingestion)
1.  **Install Dependencies**:
    ```bash
    bun install
    ```
2.  **Run Ingestion (Dry Run)**:
    ```bash
    bun run src/ingest.ts
    ```

### Frontend (Web UI)
1.  **Navigate to Web Dir**:
    ```bash
    cd web
    ```
2.  **Configuration**:
    Copy `.env.example` to `.env` and fill in your Firebase Client keys.
    ```bash
    cp .env.example .env
    ```
3.  **Run Dev Server**:
    ```bash
    npm install
    npm run dev
    ```

## Deployment

This project uses **GitHub Actions** for both data ingestion and web deployment.

### 1. Firebase Setup
*   Initialize Firebase Hosting in your project.
*   Create a hosting site: `firebase hosting:sites:create skahl-stats`.
*   Verify `.firebaserc` maps the `skahl-ui` target to your site.
*   **Live Site**: [skahl.spof.io](https://skahl.spof.io)

### 2. Secrets Configuration
Add the following secrets to your GitHub Repository:
*   `FIREBASE_SERVICE_ACCOUNT_SPOF_IO`: For deploying to Hosting and writing to Firestore (Backend).
*   **Public Client Keys** (For Web Build):
    *   `VITE_FIREBASE_API_KEY`
    *   `VITE_FIREBASE_AUTH_DOMAIN`
    *   `VITE_FIREBASE_PROJECT_ID`
    *   `VITE_FIREBASE_STORAGE_BUCKET`
    *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
    *   `VITE_FIREBASE_APP_ID`

### 3. DNS (Cloudflare)
To serve the site at `skahl.spof.io` (or your chosen domain):
1.  Add the custom domain in Firebase Console -> Hosting.
2.  Add a `CNAME` record in Cloudflare: `skahl` -> `skahl-stats.web.app` (or your firebase app domain).
    *   Result: `skahl.spof.io`

## Docs
*   [System Design](docs/system_design.md)
*   [API Documentation](docs/api_docs.md)
