/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.html",
    "./pages/**/*.html",
    "./js/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFD700",
        secondary: "#000000",
      },
      borderRadius: {
        button: "8px",
      },
    },
  },
  plugins: [],
}

