/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ff4f00", // The FoodCourt Orange
        secondary: "#0f172a",
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '3rem',
      }
    },
  },
  plugins: [],
}