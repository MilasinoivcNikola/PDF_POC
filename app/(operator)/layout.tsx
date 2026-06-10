// Operator route-group gate (commerce PR-03).
//
// Everything under (operator) — the wizard pages, generate/preview, the dev test-ai
// scaffold — is the LOCAL operator surface. This Server-Component layout 404s the
// whole group under a public deploy (DEPLOY_TARGET=public), mirroring the
// assertOperator() guard on the operator API routes: a public Vercel deploy must
// not expose the engine UI any more than it exposes the engine endpoints.
//
// It is a pure pass-through on the operator surface (the local default), so the
// existing wizard flow is unchanged. It introduces no chrome — the root layout
// (app/layout.tsx) is still the single <html>/<body> shell; the create wizard's own
// nested layout (WizardProvider) and the test-ai layout (NODE_ENV gate) compose
// underneath this one.
//
// `force-dynamic` is load-bearing — do NOT remove it to "optimize" these pages back
// to static. The wizard pages are otherwise statically prerenderable, so without it
// the `isPublic()` / notFound() decision would be baked in at BUILD time. That makes
// the gate depend on the BUILD env, not the RUNTIME env: an app built in operator
// mode (DEPLOY_TARGET unset) but then served with DEPLOY_TARGET=public at runtime
// would serve these prerendered pages as 200 — a static shell can't be un-baked by a
// runtime env flip. force-dynamic forces per-request rendering of the whole (operator)
// page group, so isPublic() is re-evaluated on every request and the gate holds at
// runtime regardless of how the app was built — matching the per-request
// assertOperator() guard on the operator API routes. This governs PAGES only; the
// (operator) route.ts handlers already gate per-request via assertOperator().

import { notFound } from "next/navigation";
import { isPublic } from "@/lib/runtime/surface";

// Render the entire (operator) page group per-request (see comment above).
export const dynamic = "force-dynamic";

export default function OperatorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (isPublic()) {
    notFound();
  }
  return children;
}
