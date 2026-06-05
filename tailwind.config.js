/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Логоны өнгөнөөс гаргасан брэндийн палитр
        ink: { DEFAULT: "#2C3A57", 600: "#36456A", 400: "#5A6B8C" }, // navy
        beak: { DEFAULT: "#F2A24E", 600: "#E2893A", 100: "#FCEBD6" }, // жүрж (хошуу)
        cream: "#FBF7F0",
        paper: "#FFFFFF",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      boxShadow: {
        soft: "0 6px 24px -8px rgba(44,58,87,0.18)",
        card: "0 2px 16px -6px rgba(44,58,87,0.14)",
      },
      borderRadius: { xl2: "1.4rem" },
    },
  },
  plugins: [],
};
