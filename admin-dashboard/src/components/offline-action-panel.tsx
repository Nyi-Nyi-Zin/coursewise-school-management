"use client";

import type { OfflineItem } from "@/lib/offline-records";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

type Section = "overview" | "students" | "announcements" | "lessons" | "quizzes" | "attendance" | "settings";
type FieldDefinition = { key: string; label: string; type?: "text" | "url" | "number" | "date" };

const moduleFields: Record<Section, FieldDefinition[]> = {
  overview: [],
  students: [{ key: "studentId", label: "Student ID" }, { key: "email", label: "Email", type: "text" }, { key: "photoUrl", label: "Profile photo URL", type: "url" }],
  announcements: [{ key: "bannerUrl", label: "Banner image URL", type: "url" }, { key: "linkUrl", label: "Destination link", type: "url" }, { key: "sortOrder", label: "Sort order", type: "number" }],
  lessons: [{ key: "thumbnailUrl", label: "Thumbnail URL", type: "url" }, { key: "telegramUrl", label: "Telegram URL", type: "url" }, { key: "videoUrl", label: "Video URL", type: "url" }, { key: "pdfUrl", label: "PDF URL", type: "url" }, { key: "sortOrder", label: "Sort order", type: "number" }],
  quizzes: [{ key: "durationMinutes", label: "Duration (minutes)", type: "number" }, { key: "totalMarks", label: "Total marks", type: "number" }],
  attendance: [{ key: "date", label: "Attendance date", type: "date" }],
  settings: [],
};

export function OfflineActionPanel({ section, initial, onClose, onSave }: { section: Section; initial: OfflineItem | null; onClose: () => void; onSave: (draft: Omit<OfflineItem, "id" | "createdAt">) => void | Promise<void> }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? defaultStatus(section));
  const [fields, setFields] = useState<Record<string, string>>(initial?.fields ?? {});
  const isAttendance = section === "attendance";
  const label = initial ? `Edit ${singleLabel(section)}` : actionLabel(section);
  return <div className="fixed inset-0 z-50 flex justify-end bg-emerald-950/30"><section className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-stone-100 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">{singleLabel(section)} management</p><h3 className="mt-1 font-display text-xl font-semibold">{label}</h3></div><button onClick={onClose} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"><X size={18} /></button></header><div className="flex-1 overflow-y-auto space-y-5 p-6"><div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><Sparkles className="mb-2 text-emerald-700" size={17} />Every field maps to the matching Firestore document when Firebase is connected. Until then, records remain available in this local management session.</div><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-stone-700 sm:col-span-2">{isAttendance ? "Student name or ID" : section === "students" ? "Student name" : "Title"}<input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder={isAttendance ? "Student ID" : "Enter details"} /></label>{moduleFields[section].map(field => <label key={field.key} className="block text-sm font-bold text-stone-700"><span>{field.label}</span><input type={field.type ?? "text"} value={fields[field.key] ?? ""} onChange={event => setFields(current => ({ ...current, [field.key]: event.target.value }))} className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-normal outline-none focus:border-emerald-600" /></label>)}</div><label className="block text-sm font-bold text-stone-700">{isAttendance ? "Note" : "Description"}<textarea value={description} onChange={event => setDescription(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm font-normal outline-none focus:border-emerald-600" placeholder="Add optional context" /></label><label className="block text-sm font-bold text-stone-700">Status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600">{statusOptions(section).map(value => <option key={value}>{value}</option>)}</select></label></div><footer className="border-t border-stone-100 p-6"><button disabled={!title.trim()} onClick={() => void onSave({ title: title.trim(), description: description.trim(), status, fields })} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Save {singleLabel(section)}</button></footer></section></div>;
}

function statusOptions(section: Section) { return section === "attendance" ? ["Present", "Absent", "Late", "Excused"] : section === "students" ? ["Active", "Inactive"] : ["Draft", "Published"]; }
function defaultStatus(section: Section) { return section === "attendance" ? "Present" : section === "students" ? "Active" : "Draft"; }
function singleLabel(section: Section) { return ({ overview: "Record", students: "Student", announcements: "Announcement", lessons: "Lesson", quizzes: "Quiz", attendance: "Attendance", settings: "Firebase" } as Record<Section, string>)[section]; }
function actionLabel(section: Section) { return `New ${singleLabel(section)}`; }
