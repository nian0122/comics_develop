/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Lilita One"', '"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        neon: {
          pink: '#ff7ce5',
          blue: '#67e8f9',
          purple: '#c084fc',
        },
      },
      backgroundImage: {
        'grid-light': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
