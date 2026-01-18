import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ChevronLeft, User } from 'lucide-react';

interface PlayerDetailData {
    id: string;
    firstName: string;
    lastName: string;
    jerseyNumber: string;
    position: string;
    shoots?: string;
    catches?: string;
    bio?: string;
    height?: string;
    weight?: string;
    image?: string;
}

export default function PlayerDetail() {
    const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>();
    const [player, setPlayer] = useState<PlayerDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!teamId || !playerId) return;
            try {
                const playerDocRef = doc(db, 'teams', teamId, 'roster', playerId);
                const playerDoc = await getDoc(playerDocRef);

                if (playerDoc.exists()) {
                    const data = playerDoc.data();
                    setPlayer({
                        id: playerDoc.id,
                        firstName: data.name_first || '',
                        lastName: data.name_last || '',
                        jerseyNumber: data.jersey_number || data.player_number || '',
                        position: data.player_type?.name_full || data.position || 'Player',
                        shoots: data.shoots,
                        catches: data.catches,
                        bio: data.bio,
                        height: data.height,
                        weight: data.weight,
                        image: data.image?.full_path
                    });
                } else {
                    console.error("Player not found");
                }
            } catch (error) {
                console.error("Error fetching player details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPlayer();
    }, [teamId, playerId]);

    if (loading) {
        return (
            <Container>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
                </div>
            </Container>
        );
    }

    if (!player) {
        return (
            <Container>
                <div className="text-center py-20">
                    <h1 className="text-2xl font-bold">Player not found</h1>
                    <Link to={`/teams/${teamId}`}>
                        <Button className="mt-4">Back to Team</Button>
                    </Link>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="space-y-8">
                <div className="flex items-center space-x-4">
                    <Link to={`/teams/${teamId}`}>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-2"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">{player.firstName} {player.lastName}</h1>
                </div>

                <Card className="border-0 bg-white shadow-sm overflow-hidden hover:scale-100 cursor-default p-0">
                    <div className="md:flex">
                        <div className="md:w-1/3 bg-gray-50 flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-gray-100">
                             {player.image ? (
                                <img
                                    src={player.image}
                                    alt={`${player.firstName} ${player.lastName}`}
                                    className="rounded-full w-48 h-48 object-cover shadow-lg border-4 border-white"
                                />
                            ) : (
                                <div className="w-48 h-48 rounded-full bg-gray-200 flex items-center justify-center shadow-inner text-gray-400">
                                    <User size={64} />
                                </div>
                            )}
                        </div>
                        <div className="p-8 md:w-2/3 space-y-6">
                            <div className="flex flex-wrap gap-4 items-center mb-6">
                                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-bold text-2xl">
                                    #{player.jerseyNumber}
                                </div>
                                <div className="text-xl font-medium text-gray-600">
                                    {player.position}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                {player.shoots && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Shoots</h3>
                                        <p className="mt-1 text-lg font-medium">{player.shoots}</p>
                                    </div>
                                )}
                                {player.catches && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Catches</h3>
                                        <p className="mt-1 text-lg font-medium">{player.catches}</p>
                                    </div>
                                )}
                                {player.height && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Height</h3>
                                        <p className="mt-1 text-lg font-medium">{player.height}</p>
                                    </div>
                                )}
                                {player.weight && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Weight</h3>
                                        <p className="mt-1 text-lg font-medium">{player.weight}</p>
                                    </div>
                                )}
                            </div>

                            {player.bio && (
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Bio</h3>
                                    <p className="text-gray-700 leading-relaxed">{player.bio}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
        </Container>
    );
}
