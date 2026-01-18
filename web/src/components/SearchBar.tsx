import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, Users } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';

interface SearchResult {
    id: string;
    name: string;
    type: 'team' | 'player';
    url: string;
    subtext?: string;
}

export const SearchBar = () => {
    const [queryText, setQueryText] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (queryText.length >= 2) {
                performSearch(queryText);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [queryText]);

    // Handle clicks outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const performSearch = async (searchText: string) => {
        setLoading(true);
        setIsOpen(true);
        setSelectedIndex(-1);

        try {
            // Normalize search text for better matching if needed,
            // but Firestore is case-sensitive by default unless we use specific techniques.
            // For this task, we'll assume case-sensitive or user types correctly (e.g., "Sasquatch")
            // Or we can try to capitalise first letter.
            // Let's stick to simple prefix search as requested.

            // Search Teams
            // Note: Firestore text search is case sensitive.
            // Often "Sasquatch" is stored as "Sasquatch".
            // If user types "sas", it won't match "Sasquatch" with simple >=.
            // A common workaround is a 'search_name' field (lowercase), but we can't change schema easily.
            // We'll try to match exact case or Capitalized case if user types lowercase.

            // Actually, let's just use the user input.
            const term = searchText;
            const endTerm = term + '\uf8ff';

            const teamsPromise = getDocs(query(
                collection(db, 'teams'),
                where('name', '>=', term),
                where('name', '<=', endTerm),
                limit(5)
            ));

            // Search Players (Collection Group)
            // We search by lastName.
            const playersPromise = getDocs(query(
                collectionGroup(db, 'roster'),
                where('name_last', '>=', term),
                where('name_last', '<=', endTerm),
                limit(5)
            ));

            const [teamsSnap, playersSnap] = await Promise.all([teamsPromise, playersPromise]);

            const newResults: SearchResult[] = [];

            teamsSnap.forEach(doc => {
                const data = doc.data();
                newResults.push({
                    id: doc.id,
                    name: data.name,
                    type: 'team',
                    url: `/teams/${doc.id}`,
                    subtext: data.league ? `${data.league}` : undefined
                });
            });

            playersSnap.forEach(doc => {
                const data = doc.data();
                const teamId = doc.ref.parent.parent?.id;
                if (teamId) {
                    newResults.push({
                        id: doc.id,
                        name: `${data.name_first} ${data.name_last}`,
                        type: 'player',
                        url: `/teams/${teamId}`, // Navigate to team page for now
                        subtext: `#${data.jersey_number || data.player_number || '?'} - ${data.position || 'Player'}`
                    });
                }
            });

            setResults(newResults);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && results[selectedIndex]) {
                handleSelect(results[selectedIndex]);
            } else if (results.length > 0) {
                 // Optional: Enter selects first result if none selected?
                 // Let's stick to explicit selection or just submitting if we had a full search page.
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (result: SearchResult) => {
        setQueryText(''); // or keep it? Usually clearing or setting to name is good.
        setIsOpen(false);
        navigate(result.url);
    };

    return (
        <div className="relative w-full max-w-sm" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search teams or players..."
                    className="pl-9 h-9 w-full md:w-[300px]"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { if (queryText.length >= 2) setIsOpen(true); }}
                />
                {loading && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {isOpen && (results.length > 0 || loading) && (
                <div className="absolute top-full mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 z-50 overflow-hidden bg-white">
                    {!loading && results.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No results found.
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="max-h-[300px] overflow-y-auto p-1">
                            {/* We could group by type, but simple list is fine too. Let's group implicitly by sorting or just render as is. */}
                            {/* Render Teams First if mixed? The query returns them separately but we pushed teams then players. So they are grouped. */}

                            {results.some(r => r.type === 'team') && (
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                    Teams
                                </div>
                            )}
                            {results.filter(r => r.type === 'team').map((result, idx) => {
                                const globalIdx = results.indexOf(result);
                                return (
                                    <div
                                        key={result.id}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                                            selectedIndex === globalIdx ? "bg-accent text-accent-foreground bg-gray-100" : "hover:bg-accent hover:text-accent-foreground hover:bg-gray-50"
                                        )}
                                        onClick={() => handleSelect(result)}
                                    >
                                        <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span>{result.name}</span>
                                            {result.subtext && <span className="text-xs text-muted-foreground">{result.subtext}</span>}
                                        </div>
                                    </div>
                                );
                            })}

                            {results.some(r => r.type === 'player') && (
                                <>
                                    <div className="h-px bg-muted my-1" />
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        Players
                                    </div>
                                </>
                            )}
                            {results.filter(r => r.type === 'player').map((result, idx) => {
                                const globalIdx = results.indexOf(result);
                                return (
                                    <div
                                        key={result.id}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                                            selectedIndex === globalIdx ? "bg-accent text-accent-foreground bg-gray-100" : "hover:bg-accent hover:text-accent-foreground hover:bg-gray-50"
                                        )}
                                        onClick={() => handleSelect(result)}
                                    >
                                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                                        <div className="flex flex-col">
                                            <span>{result.name}</span>
                                            {result.subtext && <span className="text-xs text-muted-foreground">{result.subtext}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
