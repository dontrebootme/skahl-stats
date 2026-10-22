import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container } from '../components/ui/container';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { COLLECTIONS } from '../lib/collections';
import { ChevronLeft, User, Info, Activity, Trophy } from 'lucide-react';

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
    stats?: {
        goals: number;
        assists: number;
        points: number;
        pim: number;
    };
}

export default function PlayerDetail() {
    const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>();
    const [player, setPlayer] = useState<PlayerDetailData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPlayer = async () => {
            if (!teamId || !playerId) return;
            try {
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
                        image: data.image?.full_path,
                        stats: data.stats
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
                            className="h-10 w-10 border-2 border-gray-200 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-none rounded-md"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 uppercase">{player.firstName} {player.lastName}</h1>
                </div>

                <Card className="border-0 ring-1 ring-gray-100 bg-white shadow-none overflow-hidden hover:scale-[1.005] transition-transform duration-200 rounded-lg">
                    <div className="md:flex min-h-[500px]">
                        {/* Left Column: Image & visual identity - Solid Color Block */}
                        <div className="md:w-1/3 relative bg-primary flex flex-col items-center justify-center p-8 text-white">
                            {/* Simple geometric decoration (optional) */}
                            <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 p-32 bg-white/5 rounded-full -ml-16 -mb-16 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col items-center space-y-6 text-center">
                                {player.image ? (
                                    <div className="relative">
                                        <img
                                            src={player.image}
                                            alt={`${player.firstName} ${player.lastName}`}
                                            className="relative w-56 h-56 rounded-full object-cover border-4 border-white/20"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-56 h-56 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/20">
                                        <User size={80} className="text-white/50" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="text-6xl font-black tracking-tighter text-white">
                                        #{player.jerseyNumber}
                                    </div>
                                    <div className="px-4 py-2 bg-white/10 rounded-md text-sm font-bold border border-white/10 uppercase tracking-widest">
                                        {player.position}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Stats & Bio */}
                        <div className="p-8 md:p-12 md:w-2/3 flex flex-col justify-center bg-white">
                            <div className="max-w-2xl">
                                <div className="flex items-center space-x-2 mb-6 text-primary font-bold uppercase tracking-wider text-xs">
                                    <Activity className="w-4 h-4" />
                                    <span>Player Attributes</span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Shoots</span>
                                        <p className="text-2xl font-extrabold text-gray-900">{player.shoots || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Catches</span>
                                        <p className="text-2xl font-extrabold text-gray-900">{player.catches || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Height</span>
                                        <p className="text-2xl font-extrabold text-gray-900">{player.height || "—"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Weight</span>
                                        <p className="text-2xl font-extrabold text-gray-900">{player.weight || "—"}</p>
                                    </div>
                                </div>

                                {player.stats && (
                                    <div className="mb-10 bg-muted/30 rounded-lg p-6 border border-border/50">
                                        <div className="flex items-center space-x-2 mb-4 text-primary font-bold uppercase tracking-wider text-xs">
                                            <Trophy className="w-4 h-4" />
                                            <span>Season Statistics</span>
                                        </div>
                                        <div className="grid grid-cols-4 gap-4 text-center">
                                            <div className="bg-white p-4 rounded-md ring-1 ring-gray-100">
                                                <div className="text-3xl font-black text-gray-900">{player.stats.goals}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Goals</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-md ring-1 ring-gray-100">
                                                <div className="text-3xl font-black text-gray-900">{player.stats.assists}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assists</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-md ring-1 ring-gray-100">
                                                <div className="text-3xl font-black text-primary">{player.stats.points}</div>
                                                <div className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Points</div>
                                            </div>
                                            <div className="bg-white p-4 rounded-md ring-1 ring-gray-100">
                                                <div className="text-3xl font-black text-destructive">{player.stats.pim}</div>
                                                <div className="text-[10px] font-bold text-destructive/60 uppercase tracking-wider">PIM</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t-2 border-gray-100 pt-8">
                                    <div className="flex items-center space-x-2 mb-4 text-gray-900 font-bold">
                                        <Info className="w-5 h-5 text-gray-400" />
                                        <span>Biography</span>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed text-lg font-medium">
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
