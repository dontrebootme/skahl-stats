# Skahl Stats

Automated stats scraper and API wrapper for the Sno King Adult Hockey League (SKAHL).

## Overview
This project bypasses the need for manual login by using a headless browser to retrieve the ephemeral authentication token used by the Sno King stats plugin. It then uses this token to fetch organization schedules and game statistics directly from the SportNinja API, syncing them to a Firebase Firestore database.

## Architecture
*   **Runtime**: Bun + TypeScript
*   **Auth**: Puppeteer (Headless Chrome)
*   **Database**: Firebase Firestore
*   **Automation**: GitHub Actions (Scheduled CRON)

## Prerequistes
*   [Bun](https://bun.sh)
*   Firebase CLI

## Local Development

1.  **Install Dependencies**
    ```bash
    bun install
    ```

2.  **Run Ingestion (Dry Run)**
    This will fetch the data but skip writing to Firestore if no credentials are provided.
    ```bash
    bun run src/ingest.ts
    ```

## Deployment
This project uses GitHub Actions for scheduled ingestion.

1.  **Firebase Setup**
    Initialize hosting to configure the GitHub Action secrets.
    ```bash
    firebase init hosting:github
    ```

2.  **Secrets**
    Ensure `FIREBASE_SERVICE_ACCOUNT` is set in your GitHub Repository Secrets (handled by the command above).

## Docs
*   [System Design](docs/system_design.md)
*   [API Documentation](docs/api_docs.md)
