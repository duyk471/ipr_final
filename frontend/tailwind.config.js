/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        biophilic: {
          green:      '#A8C69F', // sage green — primary buttons
          'green-dark': '#8BA883', // hover/active
          'green-light': '#C8DEBC', // subtle tints
          rose:       '#EBC2C2', // dusty rose — secondary accents
          'rose-dark':  '#D4AAAA', // hover/active
          'rose-light': '#F5DEDE', // very soft tint
          cream:      '#F9F7F2', // creamy white — background
          'cream-dark': '#EEE9DF', // slightly deeper cream for borders / cards
          bark:       '#8B7355', // warm brown text accent
          moss:       '#5C7A55', // deep green for emphasis
        },
      },
      borderRadius: {
        'xl-organic':  '1.5rem',
        '2xl-organic': '2rem',
        '3xl-organic': '2.5rem',
      },
      boxShadow: {
        'organic-sm': '0 2px 12px -2px rgba(168, 198, 159, 0.25)',
        'organic':    '0 8px 30px -8px rgba(168, 198, 159, 0.30)',
        'organic-lg': '0 16px 48px -12px rgba(168, 198, 159, 0.35)',
        'rose-glow':  '0 4px 24px -4px rgba(235, 194, 194, 0.40)',
      },
    },
  },
  plugins: [],
}
