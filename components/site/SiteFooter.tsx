import Link from "next/link";
import { BRAND, TAGLINE } from "@/lib/brand";
import { HeartBookMark } from "@/components/site/HeartBookMark";

// Shared public-site footer (Public Refresh PR-2). The 3-column `footer-rich`
// layout from the 001 mockup: brand + tagline, a "The books" column (the two
// catalog worlds + all books), and a "Dearbound" column of policy links. Used
// across every public page alongside SiteHeader.
//
// The two-worlds anchors (/books#living, /books#loss) arrive in PR-3. The policy
// links deep-link to the matching /policies section anchors (PR-4 gave each policy
// section a stable id: #how-its-made / #refunds-and-remakes / #privacy).
//
// CLIENT-SAFE by design: imports only `lib/brand` and next/link — no engine, no
// lib/supabase/server — so it stays in the public route graph (boundary test).

export function SiteFooter() {
  return (
    <footer className="footer-rich">
      <div className="footer-rich__brand">
        <span className="wordmark">
          <HeartBookMark className="wordmark__ornament" />
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
        <Link href="/policies#how-its-made">How it&apos;s made</Link>
        <Link href="/policies#refunds-and-remakes">Refunds &amp; remakes</Link>
        <Link href="/policies#privacy">Privacy</Link>
      </div>
    </footer>
  );
}
