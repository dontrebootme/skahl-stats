import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { ChevronLeft, User, Info, Activity } from 'lucide-react';

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

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!teamId || !playerId) return;
            try {
                // Add artificial delay for smooth transition
                // await new Promise(r => setTimeout(r, 300)); 

                const playerDocRef = doc(db, COLLECTIONS.TEAMS, teamId, 'roster', playerId);
                const playerDoc = await getDoc(playerDocRef);

                if (playerDoc.exists()) {
                    const data = playerDoc.data();
                    setPlayer({
                        id: playerDoc.id,
                        firstName: data.name_first || '',
                        lastName: data.name_last || '',
                        jerseyNumber: data.jersey_number || data.player_number || '#',
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
                <div className="space-y-8 animate-pulse">
                    <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
                        <div className="h-8 w-64 bg-gray-200 rounded"></div>
                    </div>
                    <Card className="border-0 bg-white shadow-sm overflow-hidden min-h-[500px]">
                        <div className="md:flex h-full">
                            <div className="md:w-1/3 bg-gray-100 h-[500px]"></div>
                            <div className="p-8 md:w-2/3 space-y-6">
                                <div className="flex gap-4">
                                    <div className="h-12 w-20 bg-gray-200 rounded"></div>
                                    <div className="h-12 w-32 bg-gray-200 rounded"></div>
                                </div>
                                <div className="space-y-4 pt-8">
                                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                                    <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </Container>
        );
    }

    if (!player) {
        return (
            <Container>
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                    <div className="bg-gray-100 p-6 rounded-full">
                        <User className="h-16 w-16 text-gray-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Player not found</h1>
                        <p className="text-gray-500 mt-2">The player you are looking for does not exist or has been removed.</p>
                    </div>
                    <Link to={`/teams/${teamId}`}>
                        <Button size="lg" className="mt-4">Return to Team</Button>
                    </Link>
                </div>
            </Container>
        );
    }

    return (
        <Container>
            <div className="space-y-8 pb-12">
                {/* Header Navigation */}
                <div className="flex items-center space-x-4">
                    <Link to={`/teams/${teamId}`}>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">{player.firstName} {player.lastName}</h1>
                </div>

                <Card className="border-0 ring-1 ring-gray-100 bg-white shadow-xl shadow-gray-200/50 overflow-hidden hover:shadow-2xl transition-all duration-300">
                    <div className="md:flex min-h-[500px]">
                        {/* Left Column: Image & visual identity */}
                        <div className="md:w-1/3 relative overflow-hidden bg-slate-900 flex flex-col items-center justify-center p-8 text-white">
                            {/* Mesh Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 z-0 opacity-50"></div>

                            {/* Decorative Elements */}
                            <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                            <div className="absolute bottom-0 left-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

                            <div className="relative z-10 flex flex-col items-center space-y-6 text-center">
                                {player.image ? (
                                    <div className="relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-70 blur opacity-75 group-hover:opacity-100 transition duration-200"></div>
                                        <img
                                            src={player.image}
                                            alt={`${player.firstName} ${player.lastName}`}
                                            className="relative w-56 h-56 rounded-full object-cover border-4 border-white shadow-2xl"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-56 h-56 rounded-full bg-slate-800 flex items-center justify-center border-4 border-slate-700 shadow-2xl">
                                        <User size={80} className="text-slate-500" />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <div className="text-5xl font-black tracking-tighter text-white/90">
                                        #{player.jerseyNumber}
                                    </div>
                                    <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-sm font-medium border border-white/10 shadow-sm inline-block">
                                        {player.position}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Stats & Bio */}
                        <div className="p-8 md:p-12 md:w-2/3 flex flex-col justify-center bg-white">
                            <div className="max-w-2xl">
                                <div className="flex items-center space-x-2 mb-6 text-blue-600 font-semibold uppercase tracking-wider text-xs">
                                    <Activity className="w-4 h-4" />
                                    <span>Player Attributes</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Shoots</span>
                                        <p className="text-xl font-bold text-gray-900">{player.shoots || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Catches</span>
                                        <p className="text-xl font-bold text-gray-900">{player.catches || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Height</span>
                                        <p className="text-xl font-bold text-gray-900">{player.height || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Weight</span>
                                        <p className="text-xl font-bold text-gray-900">{player.weight || "—"}</p>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-8">
                                    <div className="flex items-center space-x-2 mb-4 text-gray-900 font-semibold">
                                        <Info className="w-5 h-5 text-gray-400" />
                                        <span>Biography</span>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-lg">
                                        {player.bio ? player.bio : (
                                            <span className="italic text-gray-400">No biography available for this player.</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </Container>
    );
}
