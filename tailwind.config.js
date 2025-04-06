// tailwind.config.js
module.exports = {
    content: [
      "./src/**/*.{js,jsx,ts,tsx}", // Scan React components
      "./index.html", // Scan HTML file
    ],
    theme: {
      extend: {
         fontFamily: {
           sans: ['Inter', 'sans-serif'], // Set default font
         },
      },
    },
    plugins: [],
  }
  