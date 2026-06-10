import { WizardProvider } from "@/components/wizard/WizardProvider";

// Shared shell for the public order form. Mounts the client-side WizardProvider
// once here so the order form reads/writes the same draft (and the same
// localStorage entry) the operator wizard uses — the order form reuses the
// existing draft state + required-field gate, it just submits to /api/order
// (create a pending_payment order) instead of generating. The layout itself stays
// a Server Component; only the provider is a client leaf.
//
// PUBLIC SURFACE: WizardProvider imports only client-safe modules
// (lib/session/storage — localStorage, no fs; lib/session/types) so the order page
// graph stays engine-free (the boundary test asserts it).
export default function OrderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <WizardProvider>{children}</WizardProvider>;
}
