import { AdminAuthGate } from "@/components/admin-auth-gate";
import { AdminShell } from "@/components/admin-shell";
import { AdminProviders } from "@/app/providers";

export function AdminPage() {
  return <AdminProviders><AdminAuthGate><AdminShell /></AdminAuthGate></AdminProviders>;
}
