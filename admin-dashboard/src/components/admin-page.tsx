import { AdminAuthGate } from "@/components/admin-auth-gate";
import { AdminShell } from "@/components/admin-shell";

export function AdminPage() {
  return <AdminAuthGate><AdminShell /></AdminAuthGate>;
}
