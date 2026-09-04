/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          main: "#0d1117",
          sidebar: "#0a0e13",
          card: "#161c24",
          row: "#11161d",
        },
        border: {
          strong: "#26303b",
          base: "#202832",
          muted: "#1a212b",
        },
        text: {
          main: "#e8eef5",
          secondary: "#8b97a4",
          muted: "#6b7885",
        },
        brand: "#2ebd85",
        expense: "#f6465d",
        bcv: "#f0b90b",
        accent: {
          blue: "#7aa2ff",
          purple: "#b284ff",
          teal: "#2dd4bf",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
