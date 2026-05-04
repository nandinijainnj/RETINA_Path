/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#080E1A',
        surface: '#0E1625',
        card:    '#121D30',
        border:  '#1E2E45',
        teal:    '#00C9B1',
        'teal-dim': '#00856F',
        'teal-glow': 'rgba(0,201,177,0.15)',
        violet:  '#7B6FFF',
        'violet-dim': '#5548CC',
        amber:   '#F59E0B',
        'amber-dim': '#B45309',
        ink:     '#E2E8F0',
        muted:   '#64748B',
        subtle:  '#1A2840',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'scan': 'scan 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
