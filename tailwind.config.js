/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%':       { transform: 'translateX(-6px)' },
          '30%':       { transform: 'translateX(6px)' },
          '45%':       { transform: 'translateX(-5px)' },
          '60%':       { transform: 'translateX(5px)' },
          '75%':       { transform: 'translateX(-3px)' },
          '90%':       { transform: 'translateX(3px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217,119,87,0)' },
          '30%':       { boxShadow: '0 0 0 6px rgba(217,119,87,0.25)' },
          '70%':       { boxShadow: '0 0 0 4px rgba(217,119,87,0.15)' },
        },
        walk: {
          '0%, 100%': { transform: 'translate(-50%, -100%) rotate(-4deg) scale(1)' },
          '50%':       { transform: 'translate(-50%, -115%) rotate(4deg) scale(1.05)' },
        },
        celebrate: {
          '0%, 100%': { transform: 'translate(-50%, -100%) scale(1)' },
          '25%':       { transform: 'translate(-50%, -130%) scale(1.2) rotate(10deg)' },
          '75%':       { transform: 'translate(-50%, -130%) scale(1.2) rotate(-10deg)' },
        },
      },
      animation: {
        shake:     'shake 0.7s ease-in-out',
        glow:      'glow 1.2s ease-in-out',
        walk:      'walk 0.7s ease-in-out infinite',
        celebrate: 'celebrate 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
