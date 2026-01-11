/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3B82F6', // Blue 500
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#10B981', // Emerald 500
                    foreground: '#FFFFFF',
                },
                accent: {
                    DEFAULT: '#F59E0B', // Amber 500
                    foreground: '#FFFFFF',
                },
                muted: {
                    DEFAULT: '#F3F4F6', // Gray 100
                    foreground: '#111827',
                },
                destructive: {
                    DEFAULT: '#EF4444', // Red 500
                    foreground: '#FFFFFF',
                },
                background: '#FFFFFF',
                foreground: '#111827', // Gray 900
                border: '#E5E7EB', // Gray 200
            },
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
            borderRadius: {
                lg: '8px',
                md: '6px',
                sm: '4px',
            }
        },
    },
    plugins: [],
}
