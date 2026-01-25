import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Container } from './ui/container';
import { cn } from '../lib/utils';
import { Menu, X } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Standings', path: '/standings' },
        { name: 'Teams', path: '/teams' },
        { name: 'Schedule', path: '/games?tab=upcoming' },
        { name: 'Scores', path: '/games?tab=results' },
    ];

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        // Check if the current full path matches the link path
        const currentPath = location.pathname + location.search;
        // Simple match
        if (currentPath === path) return true;
        // Handle cases where we might land on /games without params (defaulting to upcoming)
        if (path === '/games?tab=upcoming' && location.pathname === '/games' && !location.search) return true;
        
        return location.pathname === path; // Fallback for standard paths without params
    };

    return (
        <div className="min-h-screen bg-muted/30 font-sans text-foreground">
            <nav className="sticky top-0 z-50 w-full border-b border-border bg-white">
                <Container>
                    <div className="flex h-20 items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <span className="text-2xl font-extrabold tracking-tighter text-foreground">
                                SKAHL<span className="text-primary">STATS</span>
                            </span>
                        </Link>

                        <div className="hidden md:flex md:space-x-8">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary",
                                        isActive(item.path)
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        <button
                            className="md:hidden"
                            onClick={() => setIsOpen(!isOpen)}
                        >
                            <span className="sr-only">Toggle menu</span>
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </Container>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden border-b border-border bg-background">
                        <Container className="py-4 flex flex-col space-y-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "text-base font-medium transition-colors hover:text-primary",
                                        isActive(item.path)
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </Container>
                    </div>
                )}
            </nav>

            <main className="py-10">
                {children}
            </main>

            <footer className="border-t border-border bg-white py-12 text-sm text-muted-foreground">
                <Container>
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p>&copy; {new Date().getFullYear()} SKAHL Stats. Not affiliated with Sno-King Hockey.</p>
                        <div className="flex space-x-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-foreground">Privacy</a>
                            <a href="#" className="hover:text-foreground">Terms</a>
                        </div>
                    </div>
                </Container>
            </footer>
        </div>
    );
};
