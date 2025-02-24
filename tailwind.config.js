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
      }
    },
  },
  plugins: [],
};
