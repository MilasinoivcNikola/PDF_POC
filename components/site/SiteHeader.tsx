import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { HeartBookMark } from "@/components/site/HeartBookMark";

// Shared public-site header (Public Refresh PR-2). Extracted once and used across
// every public page so the chrome stays consistent as bodies are redesigned in
// later PRs. A wordmark linking home + a two-link nav cluster ("The books",
// "How it's made"). The `current` prop marks the active section with
// aria-current="page" for the matching nav link.
//
// The heart-book glyph tints by audience (feature: heart-book-logo): `accent`
// gold on living/celebration pages, rose on loss/memorial pages, neutral ink
// everywhere else (the global header). The detail page passes it from the product's
// audience; all other pages leave it unset → neutral.
//
// CLIENT-SAFE by design: imports only `lib/brand`, next/link, and the client-safe
// HeartBookMark, so it stays in the public route graph without pulling the engine
// in (boundary test).

interface SiteHeaderProps {
  /** Which top-level section is active, to mark the matching nav link. */
  current?: "books" | "policies";
  /** Two-worlds glyph tint; unset → neutral ink. */
  accent?: "living" | "loss";
}

export function SiteHeader({ current, accent }: SiteHeaderProps) {
  const ornamentClass = accent
    ? `wordmark__ornament wordmark__ornament--${accent}`
    : "wordmark__ornament";
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        <HeartBookMark className={ornamentClass} />
        {BRAND}
      </Link>
      <nav className="site-nav">
        <Link href="/books" aria-current={current === "books" ? "page" : undefined}>
          The books
        </Link>
        <Link
          href="/policies"
          aria-current={current === "policies" ? "page" : undefined}
        >
          How it&apos;s made
        </Link>
      </nav>
    </header>
  );
}
