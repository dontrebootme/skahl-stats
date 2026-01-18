
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Set env var to tell Admin SDK to use emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
// Only needed for Auth emulator if used
// process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize Admin SDK (no params needed when using emulator env vars)
const app = initializeApp({
    projectId: "skahl-stats"
});

const db = getFirestore(app);

async function seed() {
    console.log('🌱 Seeding emulator data using Admin SDK...');

    // 1. Create a Team
    const teamRef = db.collection('teams').doc('team-a');
    await teamRef.set({
        name: "Thunderbirds",
        league: "SKAHL",
        division: "A",
        season: "2025-2026"
    });
    console.log('✅ Created Team: Thunderbirds');

    // 2. Create Players for that Team (Roster)
    // Subcollection 'roster' under the team document
    const rosterRef = teamRef.collection('roster');

    await rosterRef.add({
        name_first: "John",
        name_last: "Doe",
        jersey_number: "99",
        position: "Forward"
    });

    await rosterRef.add({
        name_first: "Jane",
        name_last: "Smith",
        jersey_number: "30",
        position: "Goalie"
    });
    console.log('✅ Created Players: John Doe, Jane Smith');

    console.log('🎉 Seeding complete!');
}

seed().catch(console.error);
