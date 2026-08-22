import { StudentShell } from "@/components/student-shell";
import { StudentCourseProvider } from "@/components/student-course-provider";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <StudentCourseProvider><StudentShell>{children}</StudentShell></StudentCourseProvider>;
}
