/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0b0f19',      // background utama
        panel: '#0d1117',     // permukaan kartu
        cyan: {
          neon: '#00f2fe',
        },
        electric: '#4facfe',
        glow: '#7928ca',
        lime: {
          cyber: '#00ff87',
        },
      },
      // Seluruh UI memakai Times New Roman. Di perangkat tanpa Times New Roman
      // (mis. HP Android) dipakai "Tinos" — kembaran TNR yang dimuat dari web —
      // supaya tampilan sama persis di desktop & HP, dan TIDAK jatuh ke font
      // sambung/cursive lagi.
      fontFamily: {
        display: ['"Times New Roman"', 'Tinos', '"Liberation Serif"', 'Georgia', 'serif'],
        sans: ['"Times New Roman"', 'Tinos', '"Liberation Serif"', 'Georgia', 'serif'],
        mono: ['"Times New Roman"', 'Tinos', '"Liberation Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'neon-sm': '0 0 15px rgba(0,242,254,0.10)',
        'neon': '0 0 25px rgba(0,242,254,0.35)',
        'neon-lg': '0 0 45px rgba(0,242,254,0.55)',
        'violet': '0 0 30px rgba(121,40,202,0.45)',
        'lime': '0 0 25px rgba(0,255,135,0.40)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.45', filter: 'blur(0px)' },
          '50%': { opacity: '1', filter: 'blur(1px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(2400%)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(20px,-30px,0)' },
        },
        'sheen': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        'scan': 'scan 3.5s linear infinite',
        'float-slow': 'float-slow 14s ease-in-out infinite',
        'sheen': 'sheen 2.2s linear infinite',
      },
    },
  },
  plugins: [],
}
