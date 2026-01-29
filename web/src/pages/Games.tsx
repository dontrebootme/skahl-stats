import { useEffect, useState, useCallback, useRef } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent } from '../components/ui/Card';
import { db } from '../lib/firebase';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit, 
    startAfter, 
    where,
    type QueryDocumentSnapshot,
    type DocumentData
} from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { Calendar, Clock, MapPin, Search, CalendarDays, Trophy, ChevronDown } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';

interface Game {
    id: string;
    starts_at?: string;
    started_at?: string;
    location?: string;
    home_team_score?: number;
    visiting_team_score?: number;
    homeTeam?: {
        name: string;
        score?: number;
    };
    visitingTeam?: {
        name: string;
        score?: number;
    };
}

const PAGE_SIZE = 20;

export default function Games() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const lastVisible = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Filters
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as 'upcoming' | 'results') || 'upcoming';

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchGames = useCallback(async (isNextPage = false) => {
        if (!isNextPage) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const gamesRef = collection(db, COLLECTIONS.GAMES);
            const now = new Date().toISOString();
            
            let q;
            if (activeTab === 'upcoming') {
                q = query(
                    gamesRef,
                    where('starts_at', '>=', now),
                    orderBy('starts_at', 'asc'),
                    limit(PAGE_SIZE)
                );
            } else {
                q = query(
                    gamesRef,
                    where('starts_at', '<', now),
                    orderBy('starts_at', 'desc'),
                    limit(PAGE_SIZE)
                );
            }

            if (isNextPage && lastVisible.current) {
                q = query(q, startAfter(lastVisible.current));
            }

            const snapshot = await getDocs(q);
            const gamesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Game[];

            if (isNextPage) {
                setGames(prev => [...prev, ...gamesData]);
            } else {
                setGames(gamesData);
            }

            lastVisible.current = snapshot.docs[snapshot.docs.length - 1] || null;
            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [activeTab]);

    // Initial fetch and tab change
    useEffect(() => {
        setGames([]);
        lastVisible.current = null;
        setHasMore(true);
        fetchGames(false);
    }, [activeTab, fetchGames]);

    // Client-side filtering for search and dates (on top of paginated results)
    // Note: This only filters what is currently loaded. To search across all, 
    // server-side full-text search would be needed.
    const filteredGames = games.filter(g => {
        // 1. Text Search
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const matches = 
                g.homeTeam?.name.toLowerCase().includes(lower) ||
                g.visitingTeam?.name.toLowerCase().includes(lower) ||
                g.location?.toLowerCase().includes(lower);
            if (!matches) return false;
        }

        // 2. Date Range Filter
        const gameDate = new Date(g.starts_at || g.started_at || 0);
        if (startDate) {
            const start = new Date(startDate);
            if (gameDate < start) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (gameDate > end) return false;
        }

        return true;
    });

    if (loading && games.length === 0) {
        return (
            <Container>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                </div>
            </Container>
        )
    }

    return (
        <Container>
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight">Games</h1>
                    <p className="text-muted-foreground mt-2 text-lg">League schedule and match results.</p>
                </div>

                {/* Main Filter Bar */}
                <div className="flex flex-col gap-6">
                    
                    {/* Tabs */}
                    <div className="flex space-x-1 border-b border-border">
                        <button
                            onClick={() => setSearchParams({ tab: 'upcoming' })}
                            className={cn(
                                "flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200",
                                activeTab === 'upcoming'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Upcoming Schedule
                        </button>
                        <button
                            onClick={() => setSearchParams({ tab: 'results' })}
                            className={cn(
                                "flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200",
                                activeTab === 'results'
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            )}
                        >
                            <Trophy className="w-4 h-4 mr-2" />
                            Recent Results
                        </button>
                    </div>

                    {/* Filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-lg border-0 ring-1 ring-gray-100 items-center">
                        <div className="md:col-span-4 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search loaded teams..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="hidden md:flex md:col-span-1 justify-end text-sm font-medium text-muted-foreground">
                            Filter:
                        </div>

                        <div className="md:col-span-7 flex flex-col sm:flex-row gap-2">
                             <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    From:
                                </span>
                                <input 
                                    type="date" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-12 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                    To:
                                </span>
                                <input 
                                    type="date" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button 
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="text-xs text-primary hover:underline px-2"
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Games List */}
                <div className="space-y-4">
                    {filteredGames.map((game) => {
                        const dateStr = game.starts_at || game.started_at;
                        const date = dateStr ? new Date(dateStr) : new Date();
                        
                        // Use root scores if available, fallback to nested scores
                        const hScore = game.home_team_score !== undefined ? game.home_team_score : game.homeTeam?.score;
                        const vScore = game.visiting_team_score !== undefined ? game.visiting_team_score : game.visitingTeam?.score;
                        const hasScore = hScore !== undefined && vScore !== undefined;

                        return (
                            <Card key={game.id} className="bg-white border-0 shadow-none ring-1 ring-gray-100 hover:scale-[1.01] transition-transform duration-200">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        {/* Date/Time */}
                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground min-w-[140px]">
                                            <div className="flex items-center">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        {/* Matchup Center */}
                                        <div className="flex-1 flex items-center justify-center gap-4 md:gap-8 w-full md:w-auto">
                                            <div className={cn(
                                                "text-right w-1/3 font-bold text-lg md:text-xl",
                                                !hasScore && "text-foreground"
                                            )}>
                                                {game.visitingTeam?.name || 'Visitor'}
                                            </div>

                                            <div className="flex items-center justify-center min-w-[100px]">
                                                {hasScore ? (
                                                    <div className="flex items-center space-x-3 bg-muted/30 px-4 py-2 rounded-lg font-black text-2xl tracking-widest">
                                                        <span className="text-foreground">{vScore}</span>
                                                        <span className="text-muted-foreground/30 text-lg mx-1">-</span>
                                                        <span className="text-foreground">{hScore}</span>
                                                    </div>
                                                ) : (
                                                    <div className="bg-primary/5 text-primary text-xs font-bold uppercase px-3 py-1 rounded-full">
                                                        VS
                                                    </div>
                                                )}
                                            </div>

                                            <div className={cn(
                                                "text-left w-1/3 font-bold text-lg md:text-xl",
                                                !hasScore && "text-foreground"
                                            )}>
                                                {game.homeTeam?.name || 'Home'}
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="min-w-[140px] text-right text-sm text-muted-foreground hidden md:block">
                                            <div className="flex items-center justify-end">
                                                <MapPin className="mr-2 h-4 w-4" />
                                                {game.location || 'Renton'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}

                    {filteredGames.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
                            <p className="font-medium">No games found.</p>
                            <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
                        </div>
                    )}

                    {/* Pagination Button */}
                    {hasMore && (
                        <div className="flex justify-center pt-8">
                            <Button 
                                variant="outline" 
                                onClick={() => fetchGames(true)}
                                disabled={loadingMore}
                                className="min-w-[200px] border-2 h-12 font-bold uppercase tracking-wider text-xs"
                            >
                                {loadingMore ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                ) : (
                                    <>
                                        <ChevronDown className="mr-2 h-4 w-4" />
                                        Load More Results
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    );
}
