import { initializeApp, cert, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountEnv) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountEnv)) });
} else {
    // Fallback for local dev
    console.log("ℹ️ No env vars found. Attempting ADC connection...");
    initializeApp({ projectId: "spof-io" });
}

const db = getFirestore();

async function purge() {
    console.log("🔥 Purging ALL games from Firestore...");
    const gamesRef = db.collection('games');
    const snapshot = await gamesRef.get();

    if (snapshot.empty) {
        console.log("No games to delete.");
        return;
    }

    console.log(`Found ${snapshot.size} games. Deleting in batches...`);

    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= 400) {
            await batch.commit();
            console.log(`... deleted ${totalDeleted + count}`);
            totalDeleted += count;
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
        totalDeleted += count;
    }
    console.log(`✅ Deleted ${totalDeleted} games.`);
}

purge();
