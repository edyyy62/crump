/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: '#1C3A2C',
        'forest-deep': '#152C22',
        cream: '#F3EEE4',
        'cream-dark': '#E8E1D4',
        page: '#EFE8DC',
        ink: '#1A1A1A',
        muted: '#6B645C',
        organic: '#2F6B45',
        'organic-soft': '#DCE8DC',
        low: '#C9A227',
        'low-soft': '#F4E9C4',
        moderate: '#D97706',
        'moderate-soft': '#F6E0C8',
        high: '#C44536',
        'high-soft': '#F3D4CF',
        chip: '#E6E1D8',
      },
    },
  },
  plugins: [],
};
