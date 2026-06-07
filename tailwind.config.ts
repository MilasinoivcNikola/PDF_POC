import type { Config } from "tailwindcss";

/**
 * Token values mirrored from `app/globals.css` (ported from
 * prototypes/styles.css). The CSS custom properties remain the canonical
 * runtime source; these mirror the same values so future work can use either
 * Tailwind utilities (e.g. `text-rose`, `p-8`, `text-3xl`) or CSS vars.
 * Keep both in sync — do not fork the palette.
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F6F1E6",
        "cream-deep": "#EFE7D5",
        paper: "#FBF7EE",
        ink: "#221C16",
        "ink-soft": "#5A4F44",
        "ink-muted": "#8A7F71",
        "ink-faint": "#B6A998",
        rose: "#B8857A",
        "rose-soft": "#DCBCB1",
        "rose-faint": "#F1DDD5",
        sage: "#7E8D6B",
        "sage-soft": "#B5C0A5",
        gold: "#A88147",
        "gold-soft": "#D8B780",
        border: "#E0D5C2",
        "border-soft": "#ECE3D2",
        "border-hairline": "#D9CDB7",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      spacing: {
        // Mirrors the --s-* scale (rem values from styles.css)
        "s-1": "0.25rem",
        "s-2": "0.5rem",
        "s-3": "0.75rem",
        "s-4": "1rem",
        "s-5": "1.25rem",
        "s-6": "1.5rem",
        "s-8": "2rem",
        "s-10": "2.5rem",
        "s-12": "3rem",
        "s-16": "4rem",
        "s-20": "5rem",
        "s-24": "6rem",
        "s-32": "8rem",
      },
      fontSize: {
        // Mirrors the --t-* type scale from styles.css.
        // Bare values intentionally omit Tailwind's default line-height pairing:
        // line-heights are owned by the component classes in globals.css (the
        // canonical design system). A standalone `text-lg` utility therefore
        // inherits its line-height rather than setting one — use the component
        // classes for typographic blocks, these utilities for ad-hoc sizing.
        xs: "0.75rem",
        sm: "0.875rem",
        base: "1rem",
        lg: "1.125rem",
        xl: "1.375rem",
        "2xl": "1.875rem",
        "3xl": "2.5rem",
        "4xl": "3.5rem",
        "5xl": "5rem",
        display: "6.5rem",
      },
    },
  },
  plugins: [],
};

export default config;
