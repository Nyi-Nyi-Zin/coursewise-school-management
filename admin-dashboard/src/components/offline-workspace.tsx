"use client";

import { Bell, BookOpen, CalendarDays, CircleCheck, CircleX, ClipboardCheck, Clock, FileText, Plus, Users } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ManagementSection, OfflineItem, OfflineRecords } from "@/lib/offline-records";
import { Metric } from "@/components/ui/metric";
import { ModuleInsight } from "@/components/module-insight";
import { ModuleRecordView } from "@/components/module-record-view";
import { AdminPasswordResetPanel } from "@/components/admin-password-reset-panel";

type Section = "overview" | "students" | "announcements" | "lessons" | "assignments" | "quizzes" | "attendance" | "settings";

const meta: Record<ManagementSection, { icon: typeof Users; hint: string }> = {
  students: { icon: Users, hint: "Create student profiles, update access status, or remove a profile." },
  announcements: { icon: Bell, hint: "Create and publish banner updates for the Student Website home page." },
  lessons: { icon: BookOpen, hint: "Manage lesson titles, resource notes, and publication state." },
  assignments: { icon: FileText, hint: "Publish briefs, due dates, and instructions for each course batch." },
  quizzes: { icon: ClipboardCheck, hint: "Create quiz records now, then add Firebase-backed questions after connection." },
  attendance: { icon: CalendarDays, hint: "Record attendance using Present, Absent, Late, or Excused." },
};

export function OfflineWorkspace({ section, records, scopeControls = null, onAction, onNavigate, onEdit, onDelete, onToggleStatus, onManageQuiz }: { section: Section; records: OfflineRecords; scopeControls?: ReactNode | null; onAction: () => void; onNavigate: Dispatch<SetStateAction<Section>>; onEdit: (item: OfflineItem) => void; onDelete: (id: string) => void; onToggleStatus: (item: OfflineItem) => void; onManageQuiz: (item: OfflineItem) => void }) {
  if (section === "overview") return <Overview records={records} onNavigate={onNavigate} />;
  if (section === "settings") return <><SettingsCard /><AdminPasswordResetPanel /></>;
  const current = records[section];
  const { icon: Icon, hint } = meta[section];
  const metrics = <SectionMetrics section={section} items={current} />;
  const insight = section === "students" || section === "announcements" || section === "lessons" || section === "assignments" || section === "quizzes" ? null : <ModuleInsight section={section} records={current} />;
  if (section === "students" || section === "quizzes") return <>{insight}{metrics}<ModuleRecordView section={section} records={current} scopeControls={scopeControls} onCreate={onAction} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} onManageQuiz={onManageQuiz} /></>;
  if (!current.length) return <>{insight}{metrics}<div className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-stone-300 bg-white/70 p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={20} /></span><h3 className="mt-4 font-display text-xl font-semibold">Nothing here yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">{hint}</p><button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"><Plus size={15} />Create record</button></div></div></>;
  return <>{insight}{metrics}<ModuleRecordView section={section} records={current} scopeControls={scopeControls} onCreate={onAction} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} onManageQuiz={onManageQuiz} /></>;
}

function SectionMetrics({ section, items }: { section: ManagementSection; items: OfflineItem[] }) {
  const published = items.filter(item => item.status === "Published").length;
  const cards = (() => {
    switch (section) {
      case "students": {
        const active = items.filter(item => item.status === "Active").length;
        return [
          { label: "Total students", value: items.length, icon: Users, tone: "blue" as const },
          { label: "Active students", value: active, icon: CircleCheck, tone: "green" as const },
          { label: "Inactive students", value: items.length - active, icon: CircleX, tone: "red" as const },
        ];
      }
      case "attendance": {
        const count = (status: string) => items.filter(item => item.status === status).length;
        return [
          { label: "Total records", value: items.length, icon: CalendarDays, tone: "blue" as const },
          { label: "Present", value: count("Present"), icon: CircleCheck, tone: "green" as const },
          { label: "Absent", value: count("Absent"), icon: CircleX, tone: "red" as const },
          { label: "Late", value: count("Late"), icon: Clock, tone: "amber" as const },
        ];
      }
      case "announcements":
        return [
          { label: "Total announcements", value: items.length, icon: Bell, tone: "blue" as const },
          { label: "Published", value: published, icon: CircleCheck, tone: "green" as const },
          { label: "Drafts", value: items.length - published, icon: CircleX, tone: "red" as const },
        ];
      case "lessons":
        return [
          { label: "Total lessons", value: items.length, icon: BookOpen, tone: "blue" as const },
          { label: "Published", value: published, icon: CircleCheck, tone: "green" as const },
          { label: "Drafts", value: items.length - published, icon: CircleX, tone: "red" as const },
        ];
      case "assignments":
        return [
          { label: "Total assignments", value: items.length, icon: FileText, tone: "blue" as const },
          { label: "Published", value: published, icon: CircleCheck, tone: "green" as const },
          { label: "Drafts", value: items.length - published, icon: CircleX, tone: "red" as const },
        ];
      case "quizzes":
        return [
          { label: "Total quizzes", value: items.length, icon: ClipboardCheck, tone: "blue" as const },
          { label: "Published", value: published, icon: CircleCheck, tone: "green" as const },
          { label: "Drafts", value: items.length - published, icon: CircleX, tone: "red" as const },
        ];
    }
  })();
  return <div className={`mb-5 grid gap-4 ${section === "attendance" ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3"}`}>{cards.map(card => <Metric key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />)}</div>;
}

function Overview({ records, onNavigate }: { records: OfflineRecords; onNavigate: Dispatch<SetStateAction<Section>> }) {
  const activeStudents = records.students.filter(student => student.status === "Active").length;
  const cards: Array<{ key: ManagementSection; label: string; count: number; detail: string; icon: typeof Users }> = [
    { key: "students", label: "Active students", count: activeStudents, detail: `${records.students.length} student profiles`, icon: Users },
    { key: "lessons", label: "Lessons", count: records.lessons.length, detail: "Learning library", icon: BookOpen },
    { key: "assignments", label: "Assignments", count: records.assignments.length, detail: "Course work", icon: FileText },
    { key: "quizzes", label: "Quizzes", count: records.quizzes.length, detail: "Student assessments", icon: ClipboardCheck },
    { key: "announcements", label: "Announcements", count: records.announcements.length, detail: "Student communications", icon: Bell },
  ];

  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <button key={card.key} onClick={() => onNavigate(card.key)} className="rounded-3xl border border-stone-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><card.icon size={18} /></span><p className="mt-7 font-display text-3xl font-semibold">{card.count}</p><p className="mt-1 text-sm font-bold text-stone-700">{card.label}</p><p className="mt-1 text-xs text-stone-400">{card.detail}</p></button>)}</div>;
}
function SettingsCard() { return <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Storage strategy</p><h3 className="mt-1 font-display text-xl font-semibold">Local interaction first, Firebase persistence next.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">You can create, edit, and remove records in this interface now. Once Firebase configuration is added, the same modules will persist to Firestore through the provided service boundary.</p></section>; }
