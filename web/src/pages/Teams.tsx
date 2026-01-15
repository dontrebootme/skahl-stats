import { useEffect, useState } from 'react';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, 'teams'));
                const teamsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Team[];
                setTeams(teamsData);
            } catch (error) {
                console.error("Error fetching teams: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
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
            <div className="flex flex-col space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Teams</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Select a team to view their roster and stats.</p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
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

                    {teams.length === 0 && (
                        <p className="text-muted-foreground col-span-full">No teams found in database.</p>
                    )}
                </div>
            </div>
        </Container>
    );
}
