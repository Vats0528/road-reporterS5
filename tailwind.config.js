/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['Work Sans', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
      },
    },
  },
  plugins: [],
}
