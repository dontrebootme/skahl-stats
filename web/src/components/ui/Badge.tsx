import React from 'react';
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'goalie' | 'affiliate' | 'injured' | 'suspended';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
    const variants: Record<string, string> = {
        default: "border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80",
        secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        outline: "text-slate-950 border-slate-200",
        destructive: "border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80",
        goalie: "border-transparent bg-amber-100 text-amber-800",
        affiliate: "border-transparent bg-purple-100 text-purple-800",
        injured: "border-transparent bg-rose-100 text-rose-800",
        suspended: "border-transparent bg-gray-200 text-gray-800"
    };

    return (
        <div className={cn(
            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            variants[variant] || variants.default,
            className
        )} {...props} />
    );
}
