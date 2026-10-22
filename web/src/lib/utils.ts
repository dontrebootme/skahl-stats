import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Safely resolves a score value from potential API responses.
 * Handles null, undefined, empty strings, and numeric strings.
 * Returns null if the value is invalid or empty.
 */
export function resolveScore(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
}
