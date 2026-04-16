/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#eef2ff",
        accent: "#ea580c",
        signal: "#16a34a",
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["'Segoe UI'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

