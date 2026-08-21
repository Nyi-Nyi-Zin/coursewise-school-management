import { AdminShell } from "@/components/admin-shell";
import { AdminAuthGate } from "@/components/admin-auth-gate";

export default function AdminHome() {
  return <AdminAuthGate><AdminShell /></AdminAuthGate>;
}
