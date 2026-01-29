import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { ChevronLeft, Users, Calendar, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

interface Team {
    id: string;
    name: string;
}

interface Player {
    id: string;
    firstName: string;
    lastName: string;
    jerseyNumber: string;
    position: string;
}

interface Game {
    id: string;
    starts_at?: string;
    started_at?: string;
    location?: string;
    homeTeam?: {
        id: string;
        name: string;
        score?: number;
    };
    visitingTeam?: {
        id: string;
        name: string;
        score?: number;
    };
}

export default function TeamDetail() {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();
    const [team, setTeam] = useState<Team | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    const [schedule, setSchedule] = useState<Game[]>([]);
    const [results, setResults] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'roster' | 'schedule' | 'results'>('roster');

    useEffect(() => {
        const fetchData = async () => {
            if (!teamId) return;
            try {
                // 1. Fetch Team Details
                const teamDoc = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                }

                // 2. Fetch Roster
                const rosterSnap = await getDocs(collection(db, COLLECTIONS.TEAMS, teamId, 'roster'));
                const rosterData = rosterSnap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        firstName: data.name_first || '',
                        lastName: data.name_last || '',
                        jerseyNumber: data.jersey_number || data.player_number || '',
                        position: data.player_type?.name_full || data.position || 'Player'
                    };
                }) as Player[];

                rosterData.sort((a, b) => {
                    const numA = parseInt(a.jerseyNumber) || 999;
                    const numB = parseInt(b.jerseyNumber) || 999;
                    return numA - numB;
                });
                setRoster(rosterData);

                // 3. Fetch Games (Home & Away)
                // Note: Firestore OR queries are cleaner, but standard "where" usage:
                const gamesRef = collection(db, COLLECTIONS.GAMES);

                // Fetch all games for simplicity in client-side filtering/sort
                // (In scaled app, use composite index or 2 queries)
                // For now, let's just fetch all games and filter client side as we did for Standings
                // This guarantees we get everything without complex index setup right now.
                const allGamesSnap = await getDocs(gamesRef);
                const teamGames: Game[] = [];

                allGamesSnap.forEach(doc => {
                    const data = doc.data() as Game;
                    if (data.homeTeam?.id === teamId || data.visitingTeam?.id === teamId) {
                        teamGames.push({ ...data, id: doc.id });
                    }
                });

                // Sort games by date
                teamGames.sort((a, b) => {
                    const dateA = new Date(a.starts_at || a.started_at || 0).getTime();
                    const dateB = new Date(b.starts_at || b.started_at || 0).getTime();
                    return dateA - dateB;
                });

                const now = new Date();
                const past: Game[] = [];
                const future: Game[] = [];

                teamGames.forEach(g => {
                    const gDate = new Date(g.starts_at || g.started_at || 0);
                    // If it has a score, it's a result. Or if date is past.
                    const hasScore = g.homeTeam?.score !== undefined && g.visitingTeam?.score !== undefined;

                    if (hasScore || gDate < now) {
                        past.push(g);
                    } else {
                        future.push(g);
                    }
                });

                // Results: Newest first
                setResults(past.reverse());
                // Schedule: Soonest first
                setSchedule(future);


            } catch (error) {
                console.error("Error fetching team data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [teamId]);

    if (loading) {
        return (
            <Container>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                </div>
            </Container>
        )
    }

    if (!team) {
        return (
            <Container>
                <div className="text-center py-20">
                    <h1 className="text-2xl font-bold">Team not found</h1>
                    <Link to="/teams">
                        <Button className="mt-4">Back to Teams</Button>
                    </Link>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <Link to="/teams">
                            <Button variant="outline" size="icon" className="h-10 w-10 border-2">
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-4xl font-extrabold tracking-tight">{team.name}</h1>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex space-x-1 border-b border-border">
                    {(['roster', 'schedule', 'results'] as const).map((tabId) => {
                        const tabConfig = {
                            roster: { label: 'Roster', icon: Users },
                            schedule: { label: 'Schedule', icon: Calendar },
                            results: { label: 'Results', icon: Trophy },
                        }[tabId];
                        
                        const Icon = tabConfig.icon;
                        const isActive = activeTab === tabId;
                        
                        return (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId)}
                                className={cn(
                                    "flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                )}
                            >
                                <Icon className="w-4 h-4 mr-2" />
                                {tabConfig.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab: Roster */}
                {activeTab === 'roster' && (
                    <Card className="border-0 bg-white shadow-none ring-1 ring-gray-100">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-muted/30">
                                        <tr className="border-b border-border">
                                            <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider w-20">#</th>
                                            <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider">Player Name</th>
                                            <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider w-32">Position</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {roster.map((player) => (
                                            <tr
                                                key={player.id}
                                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                onClick={() => navigate(`/teams/${teamId}/players/${player.id}`)}
                                            >
                                                <td className="p-4 font-bold text-primary">
                                                    <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary text-xs">
                                                        {player.jerseyNumber || "-"}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-bold text-lg text-foreground">
                                                    {player.firstName} {player.lastName}
                                                </td>
                                                <td className="p-4">
                                                    <span className={cn(
                                                        "inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset uppercase tracking-wide",
                                                        player.position === 'Goalie'
                                                            ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                                                            : "bg-blue-50 text-blue-700 ring-blue-700/10"
                                                    )}>
                                                        {player.position || "Player"}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {roster.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-muted-foreground">No players found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tab: Schedule */}
                {activeTab === 'schedule' && (
                    <div className="space-y-4">
                        {schedule.map((game) => (
                            <Card key={game.id} className="border-0 bg-white shadow-none ring-1 ring-gray-100 p-6 hover:scale-[1.01] transition-transform duration-200">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        <span className="font-medium text-foreground">
                                            {new Date(game.starts_at || game.started_at || "").toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span>
                                            {new Date(game.starts_at || game.started_at || "").toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex-1 flex justify-center items-center gap-8 font-bold text-lg md:text-xl">
                                        <span className={game.visitingTeam?.id === teamId ? "text-primary" : "text-foreground"}>
                                            {game.visitingTeam?.name}
                                        </span>
                                        <span className="text-muted-foreground text-sm font-normal">at</span>
                                        <span className={game.homeTeam?.id === teamId ? "text-primary" : "text-foreground"}>
                                            {game.homeTeam?.name}
                                        </span>
                                    </div>

                                    <div className="text-sm text-muted-foreground min-w-[150px] text-right">
                                        {game.location || "Renton"}
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {schedule.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
                                No upcoming games scheduled.
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: Results */}
                {activeTab === 'results' && (
                    <div className="space-y-4">
                        {results.map((game) => {
                            const isWin = (game.homeTeam?.id === teamId && (game.homeTeam?.score || 0) > (game.visitingTeam?.score || 0)) ||
                                (game.visitingTeam?.id === teamId && (game.visitingTeam?.score || 0) > (game.homeTeam?.score || 0));
                            const isTie = game.homeTeam?.score === game.visitingTeam?.score;

                            return (
                                <Card key={game.id} className="border-0 bg-white shadow-none ring-1 ring-gray-100 p-6 hover:bg-muted/10 transition-colors">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 w-32">
                                            <span className={cn(
                                                "px-2 py-1 text-xs font-black uppercase rounded-md",
                                                isWin ? "bg-green-100 text-green-700" : isTie ? "bg-gray-100 text-gray-700" : "bg-red-50 text-red-700"
                                            )}>
                                                {isWin ? "Win" : isTie ? "Tie" : "Loss"}
                                            </span>
                                            <span className="text-sm text-muted-foreground">
                                                {new Date(game.starts_at || game.started_at || "").toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center gap-8">
                                            <div className="flex items-center gap-4 w-1/3 justify-end">
                                                <span className={cn("font-bold text-lg", game.visitingTeam?.id === teamId && "text-primary")}>
                                                    {game.visitingTeam?.name}
                                                </span>
                                                <span className="text-2xl font-black">{game.visitingTeam?.score}</span>
                                            </div>
                                            <span className="text-muted-foreground">-</span>
                                            <div className="flex items-center gap-4 w-1/3 justify-start">
                                                <span className="text-2xl font-black">{game.homeTeam?.score}</span>
                                                <span className={cn("font-bold text-lg", game.homeTeam?.id === teamId && "text-primary")}>
                                                    {game.homeTeam?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                        {results.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
                                No past games found.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Container>
    );
}