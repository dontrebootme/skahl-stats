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
                            <Card className="h-full bg-white hover:bg-muted/50 transition-colors border-l-4 border-l-primary/0 hover:border-l-primary">
                                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                                        <Users className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-xl">{team.name}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">ID: {team.id}</p>
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
