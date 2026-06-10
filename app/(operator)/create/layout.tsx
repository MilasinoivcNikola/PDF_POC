import { WizardProvider } from "@/components/wizard/WizardProvider";

// Shared shell for the create wizard. Mounts the client-side WizardProvider once
// here so all six steps read and write the same draft (and the same localStorage
// entry) without re-hydrating on each navigation. The layout itself stays a
// Server Component — only the provider is a client leaf.
export default function CreateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <WizardProvider>{children}</WizardProvider>;
}
