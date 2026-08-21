"use client";

import { Bell, BookOpen, CalendarDays, ClipboardCheck, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { ManagementSection, OfflineItem, OfflineRecords } from "@/lib/offline-records";

type Section = "overview" | "students" | "announcements" | "lessons" | "quizzes" | "attendance" | "settings";

const meta: Record<ManagementSection, { icon: typeof Users; hint: string }> = {
  students: { icon: Users, hint: "Create student profiles, update access status, or remove a profile." },
  announcements: { icon: Bell, hint: "Create and publish banner updates for the student home screen." },
  lessons: { icon: BookOpen, hint: "Manage lesson titles, resource notes, and publication state." },
  quizzes: { icon: ClipboardCheck, hint: "Create quiz records now, then add Firebase-backed questions after connection." },
  attendance: { icon: CalendarDays, hint: "Record attendance using Present, Absent, Late, or Excused." },
};

export function OfflineWorkspace({ section, records, onAction, onNavigate, onEdit, onDelete }: { section: Section; records: OfflineRecords; onAction: () => void; onNavigate: Dispatch<SetStateAction<Section>>; onEdit: (item: OfflineItem) => void; onDelete: (id: string) => void }) {
  if (section === "overview") return <Overview records={records} onNavigate={onNavigate} />;
  if (section === "settings") return <SettingsCard />;
  const current = records[section];
  const { icon: Icon, hint } = meta[section];
  if (!current.length) return <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-stone-300 bg-white/70 p-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={20} /></span><h3 className="mt-4 font-display text-xl font-semibold">Nothing here yet</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">{hint}</p><button onClick={onAction} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"><Plus size={15} />Create record</button></div></div>;
  return <div className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm"><div className="divide-y divide-stone-100">{current.map(item => <article key={item.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-semibold text-stone-900">{item.title}</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-800">{item.status}</span></div><p className="mt-1 text-sm leading-6 text-stone-500">{item.description || "No additional description."}</p><p className="mt-2 text-[11px] font-semibold uppercase tracking-[.14em] text-stone-400">Created {item.createdAt} · Local-ready state</p></div><div className="flex gap-2"><button onClick={() => onEdit(item)} className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"><Pencil size={14} />Edit</button><button onClick={() => onDelete(item.id)} className="grid size-9 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></div></article>)}</div></div>;
}

function Overview({ records, onNavigate }: { records: OfflineRecords; onNavigate: Dispatch<SetStateAction<Section>> }) { const cards: Array<{ key: ManagementSection; label: string; icon: typeof Users }> = [{ key: "students", label: "Students", icon: Users }, { key: "lessons", label: "Lessons", icon: BookOpen }, { key: "quizzes", label: "Quizzes", icon: ClipboardCheck }, { key: "announcements", label: "Announcements", icon: Bell }]; return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <button key={card.key} onClick={() => onNavigate(card.key)} className="rounded-3xl border border-stone-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><card.icon size={18} /></span><p className="mt-7 font-display text-3xl font-semibold">{records[card.key].length}</p><p className="mt-1 text-sm font-bold text-stone-700">{card.label}</p><p className="mt-1 text-xs text-stone-400">Offline-ready records</p></button>)}</div>; }
function SettingsCard() { return <section className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Storage strategy</p><h3 className="mt-1 font-display text-xl font-semibold">Local interaction first, Firebase persistence next.</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">You can create, edit, and remove records in this interface now. Once Firebase configuration is added, the same modules will persist to Firestore through the provided service boundary.</p></section>; }
