import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";
import plugin from "tailwindcss/plugin";

// Enter animations used across the app (`animate-in fade-in zoom-in-95
// slide-in-from-bottom-4`). They animate the individual `scale`/`translate`
// properties, so elements centred with `-translate-x-1/2` do not jump.
const enterAnimations = plugin(({ addUtilities, matchUtilities, theme }) => {
  addUtilities({
    ".animate-in": {
      animation: "flowy-enter 240ms cubic-bezier(0.16, 1, 0.3, 1) both",
    },
    ".fade-in": { "--flowy-enter-opacity": "0" },
    ".zoom-in": { "--flowy-enter-scale": "0.6" },
  });
  matchUtilities(
    { "zoom-in": (value) => ({ "--flowy-enter-scale": value }) },
    { values: theme("scale") },
  );
  const spacing = theme("spacing") as Record<string, string>;
  matchUtilities(
    {
      "slide-in-from-top": (value) => ({ "--flowy-enter-y": `-${value}` }),
      "slide-in-from-bottom": (value) => ({ "--flowy-enter-y": value }),
      "slide-in-from-left": (value) => ({ "--flowy-enter-x": `-${value}` }),
      "slide-in-from-right": (value) => ({ "--flowy-enter-x": value }),
    },
    { values: spacing },
  );
});

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      boxShadow: {
        soft: "0 1px 2px hsl(220 30% 10% / 0.05), 0 8px 24px hsl(220 30% 10% / 0.05)",
        glow: "0 0 15px hsl(var(--primary) / 0.6)",
        "glow-sm": "0 0 8px hsl(var(--primary) / 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.0) 100%)',
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(2px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up-fade": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        }
      },
      animation: {
        "fade-in": "fade-in 160ms ease-out",
        "slide-up-fade": "slide-up-fade 240ms cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 200ms ease-out",
      },
    },
  },
  plugins: [forms, enterAnimations],
};

export default config;
