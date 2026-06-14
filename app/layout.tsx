import type { Metadata } from "next";
import { fraunces, lora, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dearbound — custom illustrated books starring your pet",
  description:
    "Custom illustrated keepsake books starring your pet — from joyful gotcha-day and adventure tales to gentle memorials, each one personalized and hand-finished.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${lora.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
