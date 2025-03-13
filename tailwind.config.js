/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          gold: {
            50: '#FFF9E5',
            100: '#FFF2CC',
            200: '#FFE699',
            300: '#FFD966',
            400: '#FFCD33',
            500: '#FFC000',  // Cor dourada principal
            600: '#CC9A00',
            700: '#997300',
            800: '#664D00',
            900: '#332600'
          },
          scrollbar: {
            track: 'transparent',
            thumb: 'rgba(255, 192, 0, 0.3)', // Dourado com 30% de opacidade
            'thumb-hover': 'rgba(255, 192, 0, 0.5)' // Dourado com 50% de opacidade
          }
        }
      },
    },
    plugins: [
      require('tailwind-scrollbar')({ nocompatible: true })
    ]
}