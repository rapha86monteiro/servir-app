import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0a0a0a",
          dark: "#1a1a1a",
          gray: "#6b7280",
          silver: "#9ca3af",
          light: "#f3f4f6",
        },
      },
    },
  },
  plugins: [],
};
export default config;
