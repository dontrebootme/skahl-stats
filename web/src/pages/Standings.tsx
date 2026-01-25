import { useEffect, useState } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { Trophy, Filter } from 'lucide-react';
import { cn } from '../lib/utils';

interface Game {
    id: string;
    // Support both schema versions for safety
    starts_at?: string;
    started_at?: string;
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

interface TeamMetadata {
    id: string;
    league?: string;
    division?: string;
}

interface TeamStats {
    id: string;
    name: string;
    gp: number;
    w: number;
    l: number;
    t: number;
    gf: number;
    ga: number;
    pts: number;
    league?: string;
    division?: string;
}

export default function Standings() {
    const [standings, setStandings] = useState<TeamStats[]>([]);
    const [filteredStandings, setFilteredStandings] = useState<TeamStats[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [leagues, setLeagues] = useState<string[]>([]);
    const [divisions, setDivisions] = useState<string[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<string>('all');
    const [selectedDivision, setSelectedDivision] = useState<string>('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Teams to get League/Division info
                const teamsSnapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
                const teamMap = new Map<string, TeamMetadata>();
                const uniqueLeagues = new Set<string>();
                const uniqueDivisions = new Set<string>();

                teamsSnapshot.forEach(doc => {
                    const data = doc.data();
                    teamMap.set(doc.id, {
                        id: doc.id,
                        league: data.league,
                        division: data.division
                    });
                    if (data.league) uniqueLeagues.add(data.league);
                    if (data.division) uniqueDivisions.add(data.division);
                });

                setLeagues(Array.from(uniqueLeagues).sort());
                setDivisions(Array.from(uniqueDivisions).sort());

                // 2. Fetch Games to calculate stats
                const gamesSnapshot = await getDocs(collection(db, COLLECTIONS.GAMES));
                const statsMap = new Map<string, TeamStats>();

                const initTeam = (id: string, name: string) => {
                    if (!statsMap.has(id)) {
                        const metadata = teamMap.get(id);
                        statsMap.set(id, {
                            id, 
                            name, 
                            gp: 0, w: 0, l: 0, t: 0, gf: 0, ga: 0, pts: 0,
                            league: metadata?.league,
                            division: metadata?.division
                        });
                    }
                    return statsMap.get(id)!;
                };

                gamesSnapshot.forEach(doc => {
                    const game = doc.data() as Game;

                    // Skip games that haven't been played (no scores)
                    if (game.homeTeam?.score === undefined || game.visitingTeam?.score === undefined) {
                        return;
                    }

                    const home = initTeam(game.homeTeam.id, game.homeTeam.name);
                    const visitor = initTeam(game.visitingTeam.id, game.visitingTeam.name);

                    const hScore = Number(game.homeTeam.score);
                    const vScore = Number(game.visitingTeam.score);

                    // Update stats
                    home.gp++;
                    home.gf += hScore;
                    home.ga += vScore;

                    visitor.gp++;
                    visitor.gf += vScore;
                    visitor.ga += hScore;

                    if (hScore > vScore) {
                        home.w++;
                        home.pts += 2;
                        visitor.l++;
                    } else if (vScore > hScore) {
                        visitor.w++;
                        visitor.pts += 2;
                        home.l++;
                    } else {
                        home.t++;
                        home.pts += 1;
                        visitor.t++;
                        visitor.pts += 1;
                    }
                });

                // Convert to array and sort
                const sortedStandings = Array.from(statsMap.values()).sort((a, b) => {
                    // 1. Points
                    if (b.pts !== a.pts) return b.pts - a.pts;
                    // 2. Wins
                    if (b.w !== a.w) return b.w - a.w;
                    // 3. Goal Diff
                    const diffA = a.gf - a.ga;
                    const diffB = b.gf - b.ga;
                    return diffB - diffA;
                });

                setStandings(sortedStandings);
                setFilteredStandings(sortedStandings);

            } catch (error) {
                console.error("Error calculating standings: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Filter Effect
    useEffect(() => {
        let result = [...standings];

        if (selectedLeague !== 'all') {
            result = result.filter(t => t.league === selectedLeague);
        }

        if (selectedDivision !== 'all') {
            result = result.filter(t => t.division === selectedDivision);
        }

        setFilteredStandings(result);
    }, [selectedLeague, selectedDivision, standings]);

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight">Standings</h1>
                        <p className="text-muted-foreground mt-2 text-lg">League rankings and statistics.</p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                         <div className="relative">
                            <select
                                className="w-full md:w-48 appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-primary"
                                value={selectedLeague}
                                onChange={(e) => setSelectedLeague(e.target.value)}
                            >
                                <option value="all">All Leagues</option>
                                {leagues.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <Filter className="h-4 w-4" />
                            </div>
                        </div>

                        <div className="relative">
                             <select
                                className="w-full md:w-48 appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-primary"
                                value={selectedDivision}
                                onChange={(e) => setSelectedDivision(e.target.value)}
                            >
                                <option value="all">All Divisions</option>
                                {divisions.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <Filter className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>

                <Card className="border-0 bg-white shadow-none ring-1 ring-gray-100">
                    <CardHeader>
                        <CardTitle className="flex items-center text-xl uppercase tracking-wider text-muted-foreground">
                            <Trophy className="mr-2 h-5 w-5 text-accent" />
                            League Table
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b border-border">
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs">Rank</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs w-1/3">Team</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center">GP</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center">W</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center">L</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center">T</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center hidden md:table-cell">GF</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center hidden md:table-cell">GA</th>
                                        <th className="p-4 font-bold text-muted-foreground uppercase tracking-wider text-xs text-center hidden md:table-cell">Diff</th>
                                        <th className="p-4 font-bold text-primary uppercase tracking-wider text-xs text-center bg-primary/5">PTS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredStandings.map((team, index) => (
                                        <tr
                                            key={team.id}
                                            className={cn(
                                                "hover:bg-muted/30 transition-colors",
                                            )}
                                        >
                                            <td className="p-4 font-medium text-muted-foreground w-12 text-center">
                                                {index + 1}
                                            </td>
                                            <td className="p-4 font-bold text-foreground">
                                                <div className="flex flex-col">
                                                    <span>{team.name}</span>
                                                    <span className="text-xs text-muted-foreground font-normal">
                                                        {team.league} {team.division && `• ${team.division}`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center font-medium">{team.gp}</td>
                                            <td className="p-4 text-center font-medium">{team.w}</td>
                                            <td className="p-4 text-center font-medium">{team.l}</td>
                                            <td className="p-4 text-center font-medium">{team.t}</td>
                                            <td className="p-4 text-center text-muted-foreground hidden md:table-cell">{team.gf}</td>
                                            <td className="p-4 text-center text-muted-foreground hidden md:table-cell">{team.ga}</td>
                                            <td className={cn(
                                                "p-4 text-center font-medium hidden md:table-cell",
                                                (team.gf - team.ga) > 0 ? "text-secondary" : (team.gf - team.ga) < 0 ? "text-destructive" : "text-muted-foreground"
                                            )}>
                                                {team.gf - team.ga > 0 ? `+${team.gf - team.ga}` : team.gf - team.ga}
                                            </td>
                                            <td className="p-4 text-center font-black text-lg bg-primary/5 text-primary">
                                                {team.pts}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredStandings.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-muted-foreground">
                                                No teams found for the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Container>
    );
}
