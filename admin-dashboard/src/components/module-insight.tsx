import type { ManagementSection, OfflineItem } from "@/lib/offline-records";
import { Bell, BookOpen, CalendarDays, ClipboardCheck, FileText, Users } from "lucide-react";

type InsightContent = {
  icon: typeof Users;
  title: string;
  body: string;
  metric: string;
};

export function ModuleInsight({ section, records }: { section: ManagementSection; records: OfflineItem[] }) {
  const contentBySection: Record<ManagementSection, InsightContent> = {
    students: { icon: Users, title: "Student directory", body: "Profiles capture identity, contact information, student ID, photo, and activation status.", metric: `${records.filter(item => item.status === "Active").length} active` },
    announcements: { icon: Bell, title: "Banner publishing", body: "Published notices appear as ordered banners on the Student Website home page.", metric: `${records.filter(item => item.status === "Published").length} published` },
    lessons: { icon: BookOpen, title: "Learning resources", body: "Each lesson supports thumbnail, Telegram, video, and PDF links for students.", metric: `${records.filter(item => item.status === "Published").length} live lessons` },
    assignments: { icon: FileText, title: "Assignment workspace", body: "Publish coursework briefs, due dates, resources, and submission instructions for each batch.", metric: `${records.filter(item => item.status === "Published").length} published` },
    quizzes: { icon: ClipboardCheck, title: "Assessment studio", body: "Open a quiz to manage multiple-choice questions and review trusted attempt results.", metric: `${records.length} assessments` },
    attendance: { icon: CalendarDays, title: "Daily attendance", body: "Record only Present, Absent, Late, or Excused, with an optional student note.", metric: `${records.length} records` },
  };
  const content = contentBySection[section];
  const Icon = content.icon;
  return <section className="mb-5 flex flex-col gap-4 rounded-3xl bg-[#143d36] p-5 text-white sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#d4f59b] text-emerald-950"><Icon size={20} /></span><div className="min-w-0 flex-1"><h3 className="font-display text-lg font-semibold">{content.title}</h3><p className="mt-1 text-sm leading-6 text-emerald-100/70">{content.body}</p></div><span className="w-fit rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#d4f59b]">{content.metric}</span></section>;
}
