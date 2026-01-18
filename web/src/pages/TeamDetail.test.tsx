import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import TeamDetail from './TeamDetail';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDoc: vi.fn(),
        getDocs: vi.fn(),
        doc: vi.fn(),
        collection: vi.fn(),
        getFirestore: vi.fn(),
    };
});

// Mock the db instance
vi.mock('../lib/firebase', () => ({
    db: {},
}));

describe('TeamDetail Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders team name and roster', async () => {
        const mockTeam = {
            id: 'team1',
            exists: () => true,
            data: () => ({ name: 'Test Team' }),
        };

        const mockRoster = [
            { id: 'p1', data: () => ({ name_first: 'John', name_last: 'Doe', player_number: '99', position: 'Forward' }) },
            { id: 'p2', data: () => ({ name_first: 'Jane', name_last: 'Smith', player_number: '1', position: 'Goalie' }) },
        ];

        (firestore.getDoc as Mock).mockResolvedValue(mockTeam);
        (firestore.getDocs as Mock).mockResolvedValue({ docs: mockRoster });

        render(
            <MemoryRouter initialEntries={['/teams/team1']}>
                <Routes>
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Team')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        // Test Goalie Highlighting Logic presence
        const goaliePosition = screen.getByText('Goalie');
        expect(goaliePosition).toHaveClass('text-amber-700');
    });

    it('sorts roster by jersey number', async () => {
        const mockTeam = {
            id: 'team1',
            exists: () => true,
            data: () => ({ name: 'Test Team' }),
        };

        const mockRoster = [
            { id: 'p1', data: () => ({ name_first: 'Player', name_last: 'Two', player_number: '20' }) },
            { id: 'p2', data: () => ({ name_first: 'Player', name_last: 'One', player_number: '10' }) },
        ];

        (firestore.getDoc as Mock).mockResolvedValue(mockTeam);
        (firestore.getDocs as Mock).mockResolvedValue({ docs: mockRoster });

        render(
            <MemoryRouter initialEntries={['/teams/team1']}>
                <Routes>
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            const player1 = screen.getByText('Player One');
            const player2 = screen.getByText('Player Two');

            // Check if they appear in correct order in the document
            expect(player1.compareDocumentPosition(player2)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        });
    });

    it('shows not found state for invalid team', async () => {
        const mockTeam = {
            exists: () => false,
            data: () => undefined,
        };

        (firestore.getDoc as Mock).mockResolvedValue(mockTeam);
        // getDocs shouldn't be called if team doesn't exist, but safe to mock
        (firestore.getDocs as Mock).mockResolvedValue({ docs: [] });

        render(
            <MemoryRouter initialEntries={['/teams/invalid']}>
                <Routes>
                    <Route path="/teams/:teamId" element={<TeamDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Team not found')).toBeInTheDocument();
        });
    });
});
