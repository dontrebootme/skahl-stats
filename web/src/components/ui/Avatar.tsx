import { useState } from 'react';
import { cn } from '../../lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
    src?: string;
    fallback?: string;
    alt?: string;
    className?: string;
}

export function Avatar({ src, fallback, alt, className }: AvatarProps) {
    const [error, setError] = useState(false);

    return (
        <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted", className)}>
            {src && !error ? (
                <img
                    src={src}
                    alt={alt || "Avatar"}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setError(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-slate-500 font-medium text-sm">
                    {fallback ? fallback : <User className="h-4 w-4" />}
                </div>
            )}
        </div>
    );
}
