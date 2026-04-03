import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        eco: {
          bg: "#060608",
          card: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.08)",
          organic: "#10B981",
          inorganic: "#F59E0B",
          metal: "#3B82F6",
          coin: "#FBBF24",
          danger: "#EF4444",
          text: "#F1F5F9",
          muted: "#64748B",
        },
      },
      fontFamily: {
        heading: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      boxShadow: {
        glass: "0 20px 60px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2)",
        "glow-emerald": "0 0 30px rgba(16,185,129,0.3)",
        "glow-amber": "0 0 30px rgba(245,158,11,0.3)",
        "glow-blue": "0 0 30px rgba(59,130,246,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.6s ease-out forwards",
        float: "floatAnim 6s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        floatAnim: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
