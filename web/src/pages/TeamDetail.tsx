import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs, query, where, or } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { ChevronLeft, Users, Calendar, MapPin, Clock } from 'lucide-react';
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
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!teamId) return;
            try {
                const teamDoc = await getDoc(doc(db, COLLECTIONS.TEAMS, teamId));
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                }

                // FETCH ROSTER FROM SUBCOLLECTION
                // The ingestion script stores players at /teams/{teamId}/roster/{playerId}
                // We use COLLECTIONS.TEAMS which maps to "skahl_teams" (or prefix)
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

                // Sort by jersey number
                rosterData.sort((a, b) => {
                    // Handle non-numeric jerseys gracefully
                    const numA = parseInt(a.jerseyNumber) || 999;
                    const numB = parseInt(b.jerseyNumber) || 999;
                    return numA - numB;
                });

                setRoster(rosterData);

                // FETCH GAMES
                // Fetch games where homeTeam.id == teamId OR visitingTeam.id == teamId
                const gamesRef = collection(db, 'games');
                const q = query(
                    gamesRef,
                    or(
                        where('homeTeam.id', '==', teamId),
                        where('visitingTeam.id', '==', teamId)
                    )
                );

                const gamesSnap = await getDocs(q);
                const gamesData = gamesSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Game[];

                // Sort by date descending (newest/upcoming first)
                gamesData.sort((a, b) => {
                    const dateA = new Date(a.starts_at || a.started_at || 0).getTime();
                    const dateB = new Date(b.starts_at || b.started_at || 0).getTime();
                    return dateB - dateA;
                });

                setGames(gamesData);

            } catch (error) {
                console.error("Error fetching team details:", error);
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
                <div className="flex items-center space-x-4">
                    <Link to="/teams">
                        <Button variant="outline" size="icon" className="h-10 w-10 border-2">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight">{team.name}</h1>
                </div>

                <Card className="border-0 bg-white shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl uppercase tracking-wider text-muted-foreground">
                            <Users className="mr-2 h-5 w-5" /> Active Roster
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b-2 border-primary/10">
                                        <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider w-20">#</th>
                                        <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider">Player Name</th>
                                        <th className="p-4 font-semibold text-muted-foreground uppercase tracking-wider w-32">Position</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roster.map((player, index) => (
                                        <tr
                                            key={player.id}
                                            className={cn(
                                                "transition-colors hover:bg-muted/50 cursor-pointer",
                                                index % 2 === 0 ? "bg-white" : "bg-muted/20"
                                            )}
                                            onClick={() => navigate(`/teams/${teamId}/players/${player.id}`)}
                                        >
                                            <td className="p-4 font-bold text-primary flex items-center">
                                                <span className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                    {player.jerseyNumber || "-"}
                                                </span>
                                            </td>
                                            <td className="p-4 font-medium text-lg">
                                                {player.firstName} {player.lastName}
                                            </td>
                                            <td className="p-4">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
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
                                            <td colSpan={3} className="p-8 text-center text-muted-foreground">No players found on roster.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 bg-white shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl uppercase tracking-wider text-muted-foreground">
                            <Calendar className="mr-2 h-5 w-5" /> Schedule / Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {games.map((game) => {
                                const dateStr = game.starts_at || game.started_at;
                                const date = dateStr ? new Date(dateStr) : new Date();

                                return (
                                    <div key={game.id} className="border rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center space-x-4 text-sm text-muted-foreground min-w-[140px]">
                                            <div className="flex items-center">
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span>{date.toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 flex items-center justify-center space-x-8 w-full md:w-auto">
                                            <div className="text-center md:text-right w-1/3">
                                                <span className="font-bold text-lg block">{game.homeTeam?.name || 'Home'}</span>
                                                <span className="text-xs text-muted-foreground block">(Home)</span>
                                            </div>

                                            <div className="flex items-center space-x-3 bg-muted/50 px-4 py-2 rounded-lg font-mono font-bold text-xl">
                                                <span className={game.homeTeam?.score !== undefined ? "text-foreground" : "text-muted-foreground/40"}>
                                                    {game.homeTeam?.score ?? '-'}
                                                </span>
                                                <span className="text-muted-foreground/40">vs</span>
                                                <span className={game.visitingTeam?.score !== undefined ? "text-foreground" : "text-muted-foreground/40"}>
                                                    {game.visitingTeam?.score ?? '-'}
                                                </span>
                                            </div>

                                            <div className="text-center md:text-left w-1/3">
                                                <span className="font-bold text-lg block">{game.visitingTeam?.name || 'Visitor'}</span>
                                                <span className="text-xs text-muted-foreground block">(Visitor)</span>
                                            </div>
                                        </div>

                                        <div className="min-w-[140px] text-right text-sm text-muted-foreground hidden md:block">
                                            <div className="flex items-center justify-end">
                                                <MapPin className="mr-2 h-4 w-4" />
                                                {game.location || 'Renton'}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            {games.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground">No games found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Container>
    );
}
