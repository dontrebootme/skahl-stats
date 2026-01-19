import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PlayerDetail from './PlayerDetail';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDoc: vi.fn(),
        doc: vi.fn(),
        getFirestore: vi.fn(),
    };
});

// Mock the db instance
vi.mock('../lib/firebase', () => ({
    db: {},
}));

describe('PlayerDetail Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders player details', async () => {
        const mockPlayer = {
            id: 'p1',
            exists: () => true,
            data: () => ({
                name_first: 'John',
                name_last: 'Doe',
                player_number: '99',
                position: 'Forward',
                shoots: 'Left',
                height: '6\'0"',
                weight: '180 lbs'
            }),
        };

        (firestore.getDoc as any).mockResolvedValue(mockPlayer);

        render(
            <MemoryRouter initialEntries={['/teams/team1/players/p1']}>
                <Routes>
                    <Route path="/teams/:teamId/players/:playerId" element={<PlayerDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('#99')).toBeInTheDocument();
            expect(screen.getByText('Forward')).toBeInTheDocument();
            expect(screen.getByText('Left')).toBeInTheDocument();
            expect(screen.getByText('6\'0"')).toBeInTheDocument();
        });
    });

    it('shows not found state for invalid player', async () => {
        const mockPlayer = {
            exists: () => false,
            data: () => undefined,
        };

        (firestore.getDoc as any).mockResolvedValue(mockPlayer);

        render(
            <MemoryRouter initialEntries={['/teams/team1/players/invalid']}>
                <Routes>
                    <Route path="/teams/:teamId/players/:playerId" element={<PlayerDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Player not found')).toBeInTheDocument();
        });
    });
});
