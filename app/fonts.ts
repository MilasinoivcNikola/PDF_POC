import { Fraunces, Lora, JetBrains_Mono } from "next/font/google";

/**
 * Project fonts loaded via next/font (self-hosted, no external Google Fonts
 * <link> at render time — important for Puppeteer self-containment later).
 *
 * Each font exposes a CSS variable that app/globals.css wires into the
 * --font-display / --font-body / --font-mono design tokens.
 */

// Display face. Loaded as a variable font (no `weight` => full wght range),
// so the design's font-variation-settings (e.g. "opsz" 144, "SOFT" 30) and
// font-weight: 300 both resolve. opsz + SOFT are extra axes the design uses;
// wght is included by default and must NOT be listed in `axes`.
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
  variable: "--font-fraunces",
});

// Body serif. Variable font (no `weight` => full wght range), with italic.
export const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  variable: "--font-lora",
});

// Monospace for labels / step indicators. Variable font (full wght range).
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});
