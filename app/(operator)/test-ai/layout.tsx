// DEV-ONLY gate for the /test-ai scaffold.
//
// The page itself is a "use client" component (it drives upload + generate from
// the browser), so the production gate lives here in a Server Component layout:
// in a real build it renders a 404 instead of the dev harness, matching the
// NODE_ENV gating on the paired /api/test-ai/generate-reference route. In dev it
// is a transparent pass-through.

import { notFound } from "next/navigation";

export default function TestAiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return children;
}
