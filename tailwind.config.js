export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: "#0f766e",
        coral: "#f97316",
        mist: "#eef6f4",
        ink: "#122026"
      },
      fontFamily: {
        sans: ["Aptos", "Segoe UI Variable", "Segoe UI", "sans-serif"],
        display: ["Aptos Display", "Aptos", "Segoe UI Variable", "sans-serif"]
      },
      boxShadow: {
        panel: "0 18px 50px rgba(15, 23, 42, 0.12)"
      }
    }
  }
};
