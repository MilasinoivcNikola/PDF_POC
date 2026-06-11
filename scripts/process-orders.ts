// Commerce PR-07 CLI: the local batch worker. Drains every `queued` order, runs
// the existing generation engine on each, and parks it at `awaiting_review`
// (success) or `failed` (error) — no manual generation step. This is the
// automation moat: run it once or twice a day (per the 24–48h roadmap promise),
// not a daemon.
//
// OPERATOR-ONLY. It loads the OpenAI key + Puppeteer path + the service-role
// Supabase client (transitively, via lib/order/worker). It lives in scripts/ and is
// never imported by the public route graph, so the PR-03 surface gate is untouched.
//
// The orchestration logic lives in lib/order/worker.ts (testable with injected,
// mocked dependencies — $0, no network). This file is a thin wrapper that wires the
// real dependencies and prints a non-secret summary, mirroring scripts/render-test.ts.
//
// Run it with the `process:orders` npm script (tsx executes the TypeScript directly):
//   npm run process:orders

import { processQueuedOrders } from "@/lib/order/worker";

async function main(): Promise<void> {
  try {
    const summary = await processQueuedOrders();

    // Non-secret roll-up: counts + order ids only — never a key, never a full
    // error object (per-order messages are already stored on the order row).
    console.log(
      `\nDone. ${summary.succeeded.length} succeeded, ` +
        `${summary.failed.length} failed, ${summary.skipped.length} skipped.`,
    );
    if (summary.succeeded.length > 0) {
      console.log(`  succeeded: ${summary.succeeded.join(", ")}`);
    }
    if (summary.failed.length > 0) {
      console.log(`  failed:    ${summary.failed.join(", ")}`);
    }
    if (summary.skipped.length > 0) {
      console.log(`  skipped:   ${summary.skipped.join(", ")}`);
    }

    // A batch that recorded any failure still completed (each failure is isolated
    // and stored on its order, recoverable via the failed → queued retry). Exit
    // non-zero so an operator/cron notices there's something to look at.
    process.exit(summary.failed.length > 0 ? 1 : 0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`process-orders failed: ${message}`);
    process.exit(1);
  }
}

void main();
