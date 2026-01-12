import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Note: Values should come from env vars in a real app, but for now we'll assume
// we're running in a context where we might need to fetch them or they are injected.
// Since this is a client app hosted on Firebase, we can often rely on automatic config
// or we need to explicitly paste the config object.
// For the purpose of this task, I will use placeholders that need to be replaced 
// or I can try to fetch the config if hosted on Firebase Hosting (/__/firebase/init.json).
// But standard practice for Vite + Firebase is using env vars.

const firebaseConfig = {
    // TODO: Replace with your actual config or use environment variables
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
