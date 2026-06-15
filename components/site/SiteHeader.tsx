import Link from "next/link";
import { BRAND } from "@/lib/brand";

// Shared public-site header (Public Refresh PR-2). Extracted once and used across
// every public page so the chrome stays consistent as bodies are redesigned in
// later PRs. A wordmark linking home + a two-link nav cluster ("The books",
// "How it's made"). The `current` prop marks the active section with
// aria-current="page" for the matching nav link.
//
// CLIENT-SAFE by design: imports only `lib/brand` and next/link, so it stays in
// the public route graph without pulling the engine in (boundary test).

interface SiteHeaderProps {
  /** Which top-level section is active, to mark the matching nav link. */
  current?: "books" | "policies";
}

export function SiteHeader({ current }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link href="/" className="wordmark">
        <svg
          className="wordmark__ornament"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 8 Q4 5 6 4 Q8 5 7 8 Z M13 8 Q15 5 13 4 Q11 5 12 8 Z M3 12 Q1 10 3 9 Q5 10 4 12 Z M16 12 Q18 10 16 9 Q14 10 15 12 Z M10 17 Q5 17 5 12 Q5 9 10 9 Q15 9 15 12 Q15 17 10 17 Z"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
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
