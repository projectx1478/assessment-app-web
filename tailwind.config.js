/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Shippori Mincho"', "serif"],
        sans: ['"Zen Kaku Gothic New"', '"Hiragino Sans"', "sans-serif"],
      },
      colors: {
        paper: "#EEF1EC",
        ink: {
          DEFAULT: "#1E2A22",
          muted: "#5B6B5E",
        },
        forest: {
          50: "#EAF3EC",
          100: "#CFE4D5",
          400: "#3E8564",
          500: "#2B6E4F",
          600: "#235A40",
          700: "#1B4631",
        },
        pen: {
          50: "#FBEAEA",
          400: "#C1443A",
          500: "#B23A3A",
          600: "#953030",
        },
        gold: {
          400: "#D4A13F",
          500: "#C08A2E",
        },
        line: "#D9DED4",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30, 42, 34, 0.06), 0 4px 16px rgba(30, 42, 34, 0.08)",
      },
    },
  },
  plugins: [],
};
