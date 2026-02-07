import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { CONFIG } from "../config";

/**
 * Returns a Firestore instance, initializing the Firebase app if needed.
 * Handles: emulator detection, service account env var, and ADC fallback.
 */
export function getDb(): Firestore {
    // Only initialize once — subsequent calls reuse the existing app
    if (getApps().length === 0) {
        const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

        if (emulatorHost) {
            console.log(`⚠️ FIRESTORE_EMULATOR_HOST detected (${emulatorHost}). Connecting to Emulator...`);
            initializeApp({ projectId: "skahl-stats" });
        } else if (serviceAccountEnv) {
            initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) });
        } else {
            console.log("ℹ️ No env vars found. Attempting ADC connection...");
            initializeApp({ projectId: CONFIG.projectId });
        }
    }

    return getFirestore();
}
