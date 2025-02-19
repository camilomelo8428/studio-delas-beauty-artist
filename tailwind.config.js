/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          scrollbar: {
            track: 'transparent',
            thumb: 'rgba(239, 68, 68, 0.3)', // Vermelho (red-500) com 30% de opacidade
            'thumb-hover': 'rgba(239, 68, 68, 0.5)' // Vermelho (red-500) com 50% de opacidade
          }
        }
      },
    },
    plugins: [
      require('tailwind-scrollbar')({ nocompatible: true })
    ]
}