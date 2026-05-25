/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyan: {
          DEFAULT: '#00E5FF',
          50: '#E6FCFF',
          100: '#B8F5FF',
          200: '#7AEDFF',
          300: '#3DE3FF',
          400: '#00E5FF',
          500: '#00C2DC',
          600: '#0099B0',
          700: '#007385',
          800: '#004F5C',
          900: '#002A33',
        },
        ink: {
          DEFAULT: '#0F1218',
          900: '#0F1218',
          800: '#1A1F29',
          700: '#262C38',
          600: '#3A4151',
          500: '#5C6577',
        },
      },
      boxShadow: {
        cyanGlow: '0 0 0 4px rgba(0, 229, 255, 0.18)',
      },
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
      },
      animation: {
        shake: 'shake 0.7s ease-in-out',
      },
    },
  },
  plugins: [],
}
