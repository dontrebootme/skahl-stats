import { Container } from '../components/ui/container';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowRight, Trophy, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
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
                                <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-primary">
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
                    <Card className="bg-white border-0">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Active Teams
                            </CardTitle>
                            <Users className="h-6 w-6 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold text-foreground">12</div>
                            <p className="text-xs text-muted-foreground mt-1">Updated today</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Games Tracked
                            </CardTitle>
                            <Trophy className="h-6 w-6 text-accent" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-extrabold text-foreground">48</div>
                            <p className="text-xs text-muted-foreground mt-1">+4 this week</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border-0">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Next Game
                            </CardTitle>
                            <Calendar className="h-6 w-6 text-secondary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">Oct 24</div>
                            <p className="text-xs text-muted-foreground mt-1">7:30 PM @ Renton</p>
                        </CardContent>
                    </Card>
                </div>
            </Container>
        </div>
    );
}
