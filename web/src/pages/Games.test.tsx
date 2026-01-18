import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Games from './Games';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn(),
        collection: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn(),
        limit: vi.fn(),
        getFirestore: vi.fn(),
    };
});

// Mock the db instance
vi.mock('../lib/firebase', () => ({
    db: {},
}));

describe('Games Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('fetches games with correct query params', async () => {
        const mockGames = [
            { id: 'g1', data: () => ({ starts_at: '2023-10-01T10:00:00Z', homeTeam: { name: 'Home' }, visitingTeam: { name: 'Visitor' } }) },
        ];

        (firestore.getDocs as any).mockResolvedValue({
            docs: mockGames,
        });

        // Mock return values for query builders so we can check if they were passed
        (firestore.collection as any).mockReturnValue('mockCollection');
        (firestore.orderBy as any).mockReturnValue('mockOrderBy');
        (firestore.limit as any).mockReturnValue('mockLimit');
        (firestore.query as any).mockReturnValue('mockQuery');

        render(
            <MemoryRouter>
                <Games />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Home')).toBeInTheDocument();
        });

        expect(firestore.collection).toHaveBeenCalledWith(expect.anything(), 'games');
        expect(firestore.orderBy).toHaveBeenCalledWith('starts_at', 'desc');
        expect(firestore.limit).toHaveBeenCalledWith(50);
        expect(firestore.query).toHaveBeenCalledWith('mockCollection', 'mockOrderBy', 'mockLimit');
        expect(firestore.getDocs).toHaveBeenCalledWith('mockQuery');
    });
});
