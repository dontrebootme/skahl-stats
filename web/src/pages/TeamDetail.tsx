import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ChevronLeft, Users } from 'lucide-react';
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

export default function TeamDetail() {
    const { teamId } = useParams<{ teamId: string }>();
    const [team, setTeam] = useState<Team | null>(null);
    const [roster, setRoster] = useState<Player[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!teamId) return;
            try {
                const teamDoc = await getDoc(doc(db, 'teams', teamId));
                if (teamDoc.exists()) {
                    setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);
                }

                // FETCH ROSTER FROM SUBCOLLECTION
                // The ingestion script stores players at /teams/{teamId}/roster/{playerId}
                const rosterSnap = await getDocs(collection(db, 'teams', teamId, 'roster'));

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
                                                "transition-colors hover:bg-muted/50",
                                                index % 2 === 0 ? "bg-white" : "bg-muted/20"
                                            )}
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
            </div>
        </Container>
    );
}
