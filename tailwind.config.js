/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B1F3B',
          light: '#12294D',
          dark: '#081729',
        },
        gblue: {
          DEFAULT: '#4285F4',
          light: '#5a9cf5',
          dark: '#3367d6',
        },
        ggreen: {
          DEFAULT: '#34A853',
          light: '#46b865',
          dark: '#2d9248',
        },
        gyellow: {
          DEFAULT: '#FBBC05',
          light: '#fcc934',
          dark: '#e5ab00',
        },
        gred: {
          DEFAULT: '#EA4335',
          light: '#ed6a5e',
          dark: '#d33426',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
