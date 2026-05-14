import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        violet: {
          DEFAULT: '#5B3DF5',
          light: '#8B5CF6',
          dark: '#4025D4',
          glow: 'rgba(91,61,245,0.25)',
        },
        gold: {
          DEFAULT: '#C8A96B',
          light: '#E8D5A3',
          dark: '#9A7A2E',
        },
        noir: {
          DEFAULT: '#0B0B0B',
          light: '#1A1A1A',
          mid: '#242424',
          soft: '#2E2E2E',
        },
        cream: '#F5F5F3',
        status: {
          confirmed: '#4ADE80',
          pending: '#F59E0B',
          declined: '#F87171',
        },
      },
      fontFamily: {
        playfair: ['Playfair Display', 'Georgia', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'violet-gradient': 'linear-gradient(135deg, #5B3DF5 0%, #8B5CF6 100%)',
        'dark-gradient': 'linear-gradient(180deg, #0B0B0B 0%, #1A1A1A 100%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s ease forwards',
        'fade-in': 'fadeIn 1s ease forwards',
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
