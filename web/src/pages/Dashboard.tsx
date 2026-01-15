import { useEffect, useState } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowRight, Trophy, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';


export default function Dashboard() {
    const [stats, setStats] = useState({
        activeTeams: 0,
        gamesTracked: 0,
        nextGame: null as { date: Date; location: string; home: string; visitor: string } | null
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Parallel fetch for counts
                const teamsColl = collection(db, 'teams');
                const gamesColl = collection(db, 'games');

                // 1. Team Count
                const teamsSnapshot = await getDocs(teamsColl);
                const teamsCount = teamsSnapshot.size;

                // 2. Games Count
                const gamesSnapshot = await getDocs(gamesColl);
                const gamesCount = gamesSnapshot.size;

                // 3. Latest Game
                // Find the very next game, OR the most recent game if none upcoming.
                const now = new Date().toISOString();

                // Try finding upcoming games first
                let nextGameQuery = query(
                    gamesColl,
                    where('starts_at', '>=', now),
                    orderBy('starts_at', 'asc'),
                    limit(1)
                );

                let nextGameSnap = await getDocs(nextGameQuery);

                // If no upcoming games, fall back to the most recent past game
                if (nextGameSnap.empty) {
                    nextGameQuery = query(
                        gamesColl,
                        orderBy('starts_at', 'desc'),
                        limit(1)
                    );
                    nextGameSnap = await getDocs(nextGameQuery);
                }

                let nextGameData = null;
                try {
                    if (!nextGameSnap.empty) {
                        const doc = nextGameSnap.docs[0].data();

                        // Safety check for date
                        const dateStr = doc.starts_at || doc.started_at;
                        let validDate = new Date();
                        if (dateStr) {
                            const parsed = new Date(dateStr);
                            if (!isNaN(parsed.getTime())) {
                                validDate = parsed;
                            }
                        }

                        nextGameData = {
                            date: validDate,
                            location: doc.location || 'Renton',
                            home: doc.homeTeam?.name || 'TBD',
                            visitor: doc.visitingTeam?.name || 'TBD'
                        };
                    }
                } catch (e) {
                    console.warn("Index query failed. Using placeholder behavior for Next/Latest Game.", e);
                }

                setStats({
                    activeTeams: teamsCount,
                    gamesTracked: gamesCount,
                    nextGame: nextGameData
                });

            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground md:py-32">
                {/* Background Decoration */}
                <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5" />
                <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rotate-12 bg-white/5" />

                <Container className="relative">
                    <div className="max-w-2xl space-y-6">
                        <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
                            SKAHL ANALYTICS
                        </h1>
                        <p className="text-xl font-medium text-primary-foreground/90 sm:text-2xl">
                            Performance metrics and roster insights for Sno-King coaches.
                        </p>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Link to="/teams">
                                <Button size="lg" variant="secondary" className="w-full sm:w-auto font-bold">
                                    View Teams <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link to="/games">
                                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white bg-transparent hover:bg-white hover:text-primary">
                                    Recent Games
                                </Button>
                            </Link>
                        </div>
                    </div>
                </Container>
            </section>

            {/* Quick Stats Grid */}
            <Container>
                <div className="grid gap-6 md:grid-cols-3">
                    <Card className="bg-white border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Active Teams
                            </CardTitle>
                            <Users className="h-6 w-6 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold text-foreground">{stats.activeTeams}</div>
                            <p className="text-xs text-muted-foreground mt-1">Registered teams</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Games Tracked
                            </CardTitle>
                            <Trophy className="h-6 w-6 text-accent" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold text-foreground">{stats.gamesTracked}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total games in system</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Latest Game
                            </CardTitle>
                            <Calendar className="h-6 w-6 text-secondary" />
                        </CardHeader>
                        <CardContent>
                            {stats.nextGame ? (
                                <>
                                    <div className="text-xl font-bold text-foreground">
                                        {stats.nextGame.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stats.nextGame.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} @ {stats.nextGame.location}
                                    </p>
                                    <p className="text-xs font-semibold text-primary mt-1">
                                        {stats.nextGame.visitor} vs {stats.nextGame.home}
                                    </p>
                                </>
                            ) : (
                                <div className="text-muted-foreground text-sm">No upcoming games scheduled</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
