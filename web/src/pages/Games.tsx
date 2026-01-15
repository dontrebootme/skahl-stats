import { useEffect, useState } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { Calendar, Clock, MapPin } from 'lucide-react';

interface Game {
    id: string;
    starts_at: string;
    location?: string;
    homeTeam?: {
        name: string;
        score?: number;
    };
    visitingTeam?: {
        name: string;
        score?: number;
    };
}

export default function Games() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGames = async () => {
            try {
                // Fetch recent 50 games
                // Note: Emulators sometimes struggle with complex indexes, so simple queries are safer usually,
                // but orderBy is standard. If index missing, check console.
                const gamesRef = collection(db, 'games');
                // Creating a query against the collection
                // We'll sort by starts_at descending to show newest first
                // const q = query(gamesRef, orderBy('starts_at', 'desc'), limit(50));

                // For safety in this test env (if indexes missing), just fetch all and sort client side
                const snapshot = await getDocs(gamesRef);
                const gamesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Game[];

                // Sort client side for reliability in this specific task context
                gamesData.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

                setGames(gamesData);
            } catch (error) {
                console.error("Error fetching games:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchGames();
    }, []);

    if (loading) {
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
                    <h1 className="text-4xl font-bold tracking-tight">Recent Games</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Latest scores and schedule.</p>
                </div>

                <div className="space-y-4">
                    {games.map((game) => {
                        const date = new Date(game.starts_at);
                        return (
                            <Card key={game.id} className="bg-white hover:bg-muted/30 transition-colors">
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
                                            <div className="text-right w-1/3">
                                                <span className="font-bold text-lg md:text-xl block">{game.visitingTeam?.name || 'Visitor'}</span>
                                            </div>

                                            <div className="flex items-center space-x-3 bg-muted/50 px-4 py-2 rounded-lg font-mono font-bold text-xl">
                                                <span className={game.visitingTeam?.score !== undefined ? "text-foreground" : "text-muted-foreground/40"}>
                                                    {game.visitingTeam?.score ?? '-'}
                                                </span>
                                                <span className="text-muted-foreground/40">vs</span>
                                                <span className={game.homeTeam?.score !== undefined ? "text-foreground" : "text-muted-foreground/40"}>
                                                    {game.homeTeam?.score ?? '-'}
                                                </span>
                                            </div>

                                            <div className="text-left w-1/3">
                                                <span className="font-bold text-lg md:text-xl block">{game.homeTeam?.name || 'Home'}</span>
                                            </div>
                                        </div>

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

                    {games.length === 0 && (
                        <p className="text-center py-12 text-muted-foreground">No games found.</p>
                    )}
                </div>
            </div>
        </Container>
    );
}
