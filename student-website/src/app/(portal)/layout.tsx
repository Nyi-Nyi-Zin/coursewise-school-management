import { StudentShell } from "@/components/student-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <StudentShell>{children}</StudentShell>;
}
