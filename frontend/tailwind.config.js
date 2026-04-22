/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        biophilic: {
          green: '#A8C69F',
          rose: '#EBC2C2',
          cream: '#F9F7F2',
          'green-dark': '#8BA883', // A slightly darker version for hover/active states
          'rose-dark': '#D4AAAA',   // A slightly darker version for hover/active states
        },
      },
      borderRadius: {
        'xl-organic': '1.5rem',
        '2xl-organic': '2rem',
      }
    },
  },
  plugins: [],
}
