import Link from "next/link";
import { BRAND, TAGLINE } from "@/lib/brand";

// Shared public-site footer (Public Refresh PR-2). The 3-column `footer-rich`
// layout from the 001 mockup: brand + tagline, a "The books" column (the two
// catalog worlds + all books), and a "Dearbound" column of policy links. Used
// across every public page alongside SiteHeader.
//
// The two-worlds anchors (/books#living, /books#loss) arrive in PR-3; until then
// they resolve to the top of /books — acceptable. The policy links all point at
// /policies (its sections carry no anchor ids yet), matching the mockup.
//
// CLIENT-SAFE by design: imports only `lib/brand` and next/link — no engine, no
// lib/supabase/server — so it stays in the public route graph (boundary test).

export function SiteFooter() {
  return (
    <footer className="footer-rich">
      <div className="footer-rich__brand">
        <span className="wordmark">
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
        </span>
        <p className="footer-rich__tagline">
          {TAGLINE} Made slowly, made by hand.
        </p>
      </div>
      <div className="footer-rich__col">
        <h4>The books</h4>
        <Link href="/books#living">Celebration titles</Link>
        <Link href="/books#loss">Memorial titles</Link>
        <Link href="/books">All books</Link>
      </div>
      <div className="footer-rich__col">
        <h4>{BRAND}</h4>
        <Link href="/policies">How it&apos;s made</Link>
        <Link href="/policies">Refunds &amp; remakes</Link>
        <Link href="/policies">Privacy</Link>
      </div>
    </footer>
  );
}
