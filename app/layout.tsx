import type { Metadata } from "next";
import { fraunces, lora, jetbrainsMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quietly Kept — A gentle goodbye",
  description:
    "A twelve-page personalized story to help your child understand and grieve the loss of a beloved pet.",
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
