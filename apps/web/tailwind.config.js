/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cartoon: {
          yellow: '#FFDE59',
          orange: '#FF914D',
          coral: '#FF5757',
          mint: '#7ED957',
          blue: '#5CE1E6',
          sky: '#38B6FF',
          purple: '#CB6CE6',
          cream: '#FFF9E6',
          dark: '#1E1E24',
        },
      },
      fontFamily: {
        cartoon: ['Fredoka', 'Baloo 2', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cartoon: '4px 4px 0px #1E1E24',
        'cartoon-sm': '2px 2px 0px #1E1E24',
        'cartoon-lg': '6px 6px 0px #1E1E24',
        'cartoon-xl': '8px 8px 0px #1E1E24',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
