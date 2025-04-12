/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          pink: {
            50: '#FFF0F7',
            100: '#FFE0EF',
            200: '#FFC2DF',
            300: '#FFA3CF',
            400: '#FF85BF',
            500: '#FF66AF',  // Cor rosa principal
            600: '#CC529C',
            700: '#993D74',
            800: '#66294C',
            900: '#331426'
          },
          scrollbar: {
            track: 'transparent',
            thumb: 'rgba(255, 102, 175, 0.3)', // Rosa com 30% de opacidade
            'thumb-hover': 'rgba(255, 102, 175, 0.5)' // Rosa com 50% de opacidade
          }
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }
      },
    },
    plugins: [
      require('tailwind-scrollbar')({ nocompatible: true })
    ]
}