/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './src/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        pitch: '#0c0a09',
        panel: '#1c1917',
        panelRaised: '#292524',
        line: '#44403c',
        mist: '#d6d3d1',
        ember: '#f59e0b',
        fog: '#e7e5e4',
      },
    },
  },
  plugins: [],
};
