import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import Teams from './Teams';
import { MemoryRouter } from 'react-router-dom';
import * as firestore from 'firebase/firestore';

// Mock firebase/firestore
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('firebase/firestore');
    return {
        ...actual,
        getDocs: vi.fn(),
        collection: vi.fn(),
        getFirestore: vi.fn(),
    };
});

// Mock the db instance
vi.mock('../lib/firebase', () => ({
    db: {},
}));

describe('Teams Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading state initially', () => {
        // Mock getDocs to never resolve immediately to test loading state
        (firestore.getDocs as Mock).mockReturnValue(new Promise(() => { }));

        render(
            <MemoryRouter>
                <Teams />
            </MemoryRouter>
        );

        // We expect the loading spinner container to be present
        // The implementation has a div with animate-spin class
        // Ideally we'd have a role or test id, but checking for the spinner class or structure works
        // Looking at the code: <div className="animate-spin ..."></div>
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('renders teams when data is fetched', async () => {
        const mockTeams = [
            { id: 'team1', data: () => ({ name: 'Team One' }) },
            { id: 'team2', data: () => ({ name: 'Team Two' }) },
        ];

        (firestore.getDocs as Mock).mockResolvedValue({
            docs: mockTeams,
        });

        render(
            <MemoryRouter>
                <Teams />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Team One')).toBeInTheDocument();
            expect(screen.getByText('Team Two')).toBeInTheDocument();
        });

        expect(screen.getByText('Teams')).toBeInTheDocument();
    });

    it('shows empty state when no teams found', async () => {
        (firestore.getDocs as Mock).mockResolvedValue({
            docs: [],
        });

        render(
            <MemoryRouter>
                <Teams />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No teams found in database.')).toBeInTheDocument();
        });
    });
});
