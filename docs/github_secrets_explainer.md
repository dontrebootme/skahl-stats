### The GitHub Safe Harbor Model

Here is how the "GitHub side" keeps things safe while still building a public app:

1.  **The Vault (Secrets)**
    *   You store keys in **Settings > Secrets**.
    *   GitHub encrypts them. Even you cannot see them again (you can only overwrite them).
    *   The source code (`.ts` files) contains *references* (`import.meta.env.VITE_...`) but **zero actual values**.

2.  **The Injection (CI/CD)**
    *   When a commit hits `main`, the GitHub Action wakes up.
    *   It temporarily unlocks the secrets and sets them as **Environment Variables** in the runner's memory.
    *   The command `npm run build` runs.

3.  **The "Baking" (Vite)**
    *   Vite sees `import.meta.env.VITE_FIREBASE_API_KEY` in the code.
    *   It looks at the environment variables.
    *   It **replaces the variable with the actual value** in the final JavaScript bundle.
    *   *Result*: The deployed file (`dist/assets/index.js`) has the key embedded, but your source code repo remains generic and clean.

4.  **The Deployment**
    *   The Service Account Key (`FIREBASE_SERVICE_ACCOUNT...`) is used *only* by the `firebase deploy` command to authenticate with Google. It is **never** baked into the app. It stays on the server side.

### Summary
*   **Repo**: Safe (No keys).
*   **Build Server**: Safe (Keys exist only for 3 minutes in memory).
*   **Public Site**: Contains Public Keys (Required for functionality).
