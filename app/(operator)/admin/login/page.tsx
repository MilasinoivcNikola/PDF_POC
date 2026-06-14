// Operator sign-in page (commerce PR-08). Server Component: if a valid session is
// already present it redirects straight to /admin, otherwise it renders the login
// form. The (operator) layout already 404s this whole group under a public build,
// so this page only exists on the local operator surface.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getOperatorUserId } from "@/lib/supabase/auth";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "@/app/(operator)/admin/login/LoginForm";

export default async function AdminLoginPage() {
  // Already signed in → straight to the queue.
  if (await getOperatorUserId()) {
    redirect("/admin");
  }

  return (
    <div className="page-wrap">
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
        <div className="label">Admin · Sign in</div>
      </header>

      <main className="wizard" style={{ maxWidth: "26em" }}>
        <div style={{ marginBottom: "var(--s-12)" }}>
          <h1 className="display-md">The review desk</h1>
          <p className="lede" style={{ marginTop: "var(--s-3)" }}>
            Sign in to review and approve the books waiting to be finished.
          </p>
        </div>
        <LoginForm />
      </main>

      <footer className="site-footer">
        <p className="label">Operator only · Local</p>
      </footer>
    </div>
  );
}
