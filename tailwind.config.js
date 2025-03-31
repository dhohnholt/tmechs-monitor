/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tmechs: {
          gray: '#8B8B8C',
          forest: '#014040',
          sage: '#A3BFBF',
          light: '#EBF2F2',
          dark: '#0D0D0D'
        },
        textOn: {
          forest: '#FFFFFF',
          sage: '#0D0D0D',
          light: '#0D0D0D',
          dark: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
};