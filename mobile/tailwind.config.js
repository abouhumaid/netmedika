/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        pharmacy: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          600: '#0F766E',
          700: '#115E59',
          900: '#134E4A',
        },
        slateink: '#0F172A',
      },
    },
  },
  plugins: [],
};
