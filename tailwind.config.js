/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        beam: {
          '0%, 100%': {
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%) -100% 0 / 200% 100%'
          },
          '50%': {
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%) 100% 0 / 200% 100%'
          }
        }
      },
      textShadow: {
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.5)',
        'lg': '0 2px 4px rgba(0, 0, 0, 0.7)',
        'xl': '0 2px 5px rgba(0, 0, 0, 0.9)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.text-shadow': {
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
        },
        '.text-shadow-lg': {
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
        },
        '.text-shadow-xl': {
          textShadow: '0 2px 5px rgba(0, 0, 0, 0.9)',
        },
        '.text-shadow-none': {
          textShadow: 'none',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
