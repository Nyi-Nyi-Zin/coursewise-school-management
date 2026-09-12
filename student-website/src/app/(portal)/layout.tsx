import { StudentShell } from "@/components/student-shell";
import { StudentCourseProvider } from "@/components/student-course-provider";
import { StudentAuthProvider } from "@/components/student-auth-provider";
import { PortalDataProviders } from "../providers";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalDataProviders><StudentAuthProvider><StudentCourseProvider><StudentShell>{children}</StudentShell></StudentCourseProvider></StudentAuthProvider></PortalDataProviders>;
}
