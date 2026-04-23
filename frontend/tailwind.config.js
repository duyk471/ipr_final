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
          // ── Light Mode ──────────────────────────────
          green:            '#A8C69F', // sage green — primary buttons
          'green-dark':     '#8BA883', // hover/active
          'green-light':    '#C8DEBC', // subtle tints
          rose:             '#EBC2C2', // dusty rose — secondary accents
          'rose-dark':      '#D4AAAA', // hover/active
          'rose-light':     '#F5DEDE', // very soft tint
          cream:            '#F3F1EA', // softer creamy background — less glaring
          'cream-dark':     '#E7E1D2', // distinct borders/cards
          stone:            '#EBE8DF', // muted stone for secondary surfaces
          'stone-dark':     '#DCD7C9', // darker stone for high contrast borders
          bark:             '#6B563D', // darker warm brown for better contrast
          moss:             '#4A6344', // darker deep green for emphasis

          // ── Dark Mode (forest night) ─────────────────
          'dark-bg':        '#121A13', // deepest background (nighttime forest)
          'dark-surface':   '#1A241B', // primary surface
          'dark-card':      '#232E24', // card / sidebar
          'dark-border':    '#2E3D2F', // subtle dark sage border
          'dark-green':     '#B8D4AF', // sage green lifted for dark bg contrast
          'dark-text':      '#E0E8E1', // off-white / light mint grey — primary text
          'dark-text-muted':'#8BA890', // muted text
          'dark-rose':      '#EBC2C2', // dusty rose (kept)
          'dark-terra':     '#FFB085', // soft terracotta
        },
      },
      borderRadius: {
        'xl-organic':  '1.5rem',
        '2xl-organic': '2rem',
        '3xl-organic': '2.5rem',
      },
      boxShadow: {
        'organic-sm':   '0 2px 12px -2px rgba(168, 198, 159, 0.25)',
        'organic':      '0 8px 30px -8px rgba(168, 198, 159, 0.30)',
        'organic-lg':   '0 16px 48px -12px rgba(168, 198, 159, 0.35)',
        'rose-glow':    '0 4px 24px -4px rgba(235, 194, 194, 0.40)',
        // Dark mode shadows
        'dark-sm':      '0 2px 12px -2px rgba(18, 26, 19, 0.60)',
        'dark-md':      '0 8px 30px -8px rgba(18, 26, 19, 0.70)',
        'dark-green-glow': '0 0 20px 2px rgba(184, 212, 175, 0.18)',
        'dark-rose-glow':  '0 0 16px 2px rgba(235, 194, 194, 0.20)',
        'dark-terra-glow': '0 0 16px 2px rgba(255, 176, 133, 0.18)',
      },
    },
  },
  plugins: [],
}
