/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./gh-pages/index.html",
        "./gh-pages/src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                }
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
