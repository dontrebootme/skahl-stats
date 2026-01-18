import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Container } from './ui/container';
import { cn } from '../lib/utils';
import { Menu, X } from 'lucide-react';
import { SearchBar } from './SearchBar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Teams', path: '/teams' },
        { name: 'Games', path: '/games' },
    ];

    return (
        <div className="min-h-screen bg-muted/30 font-sans text-foreground">
            <nav className="sticky top-0 z-50 w-full border-b border-border/5 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                                        location.pathname === item.path
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        <div className="hidden md:block">
                            <SearchBar />
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
                            <div className="mb-2">
                                <SearchBar />
                            </div>
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "text-base font-medium transition-colors hover:text-primary",
                                        location.pathname === item.path
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
