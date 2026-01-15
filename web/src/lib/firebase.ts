import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Note: Values should come from env vars in a real app, but for now we'll assume
// we're running in a context where we might need to fetch them or they are injected.
// Since this is a client app hosted on Firebase, we can often rely on automatic config
// or we need to explicitly paste the config object.
// For the purpose of this task, I will use placeholders that need to be replaced 
// or I can try to fetch the config if hosted on Firebase Hosting (/__/firebase/init.json).
// But standard practice for Vite + Firebase is using env vars.

// Fallback to 'skahl-stats' for local development to match emulator seed
const projectId = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'skahl-stats'
    : import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize app
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Connect to emulators if on localhost
// Connect to emulators if on localhost
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const { connectFirestoreEmulator } = await import('firebase/firestore');
    console.log(`🔗 Connecting to Firestore Emulator (${projectId})...`);

    // Force the app to look at the same project ID we seeded
    // (This is a workaround because the initialized app might have a different projectId)
    // Actually, we can't easily change the app's projectId after init, but the emulator 
    // connection might default to it. 
    // LIMITATION: 'connectFirestoreEmulator' doesn't take a projectId arg.
    // The emulator client sends the projectId from 'app'.

    connectFirestoreEmulator(db, 'localhost', 8080);
}


