import { useEffect, useState } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { Link } from 'react-router-dom';
import { Users, Filter } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    season_id?: string;
    league?: string;
    division?: string;
    image?: {
        full_path: string;
    };
}

export default function Teams() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [leagues, setLeagues] = useState<string[]>([]);
    const [divisions, setDivisions] = useState<string[]>([]);
    const [selectedLeague, setSelectedLeague] = useState<string>('all');
    const [selectedDivision, setSelectedDivision] = useState<string>('all');

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEAMS));
                const teamsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Team[];

                // Extract filters
                const uniqueLeagues = new Set<string>();
                const uniqueDivisions = new Set<string>();

                teamsData.forEach(t => {
                    if (t.league) uniqueLeagues.add(t.league);
                    if (t.division) uniqueDivisions.add(t.division);
                });

                setLeagues(Array.from(uniqueLeagues).sort());
                setDivisions(Array.from(uniqueDivisions).sort());

                setTeams(teamsData);
                setFilteredTeams(teamsData);
            } catch (error) {
                console.error("Error fetching teams: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, []);

    // Filter Logic
    useEffect(() => {
        let result = [...teams];

        if (selectedLeague !== 'all') {
            result = result.filter(t => t.league === selectedLeague);
        }

        if (selectedDivision !== 'all') {
            result = result.filter(t => t.division === selectedDivision);
        }

        setFilteredTeams(result);
    }, [teams, selectedLeague, selectedDivision]);

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
            <div className="flex flex-col space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight">Teams</h1>
                        <p className="text-muted-foreground mt-2 text-lg">Select a team to view their roster and stats.</p>
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

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredTeams.map((team) => (
                        <Link key={team.id} to={`/teams/${team.id}`}>
                            <Card className="h-full bg-white hover:bg-muted/50 transition-colors hover:shadow-md cursor-pointer overflow-hidden border-0 shadow-sm ring-1 ring-inset ring-gray-200">
                                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                                    <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mr-4 overflow-hidden border border-gray-100 shrink-0">
                                        {team.image?.full_path ? (
                                            <img
                                                src={team.image.full_path}
                                                alt={team.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <Users className="h-8 w-8 text-primary/40" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg truncate">{team.name}</CardTitle>
                                        {team.league && (
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mt-1">
                                                {team.league} {team.division ? `- ${team.division}` : ''}
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground flex justify-between items-center mt-2">
                                        <span>View Roster &rarr;</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}

                    {filteredTeams.length === 0 && (
                        <p className="text-muted-foreground col-span-full text-center py-12">No teams found for the selected filters.</p>
                    )}
                </div>
            </div>
        </Container>
    );
}
