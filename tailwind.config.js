/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Element category palette
        'cat-alkali': '#ff6b6b',
        'cat-alkaline': '#ff9f43',
        'cat-transition': '#feca57',
        'cat-posttransition': '#48dbfb',
        'cat-metalloid': '#1dd1a1',
        'cat-nonmetal': '#00d2d3',
        'cat-halogen': '#54a0ff',
        'cat-noble': '#5f27cd',
        'cat-lanthanide': '#f368e0',
        'cat-actinide': '#ee5253',
      },
    },
  },
  plugins: [],
};
