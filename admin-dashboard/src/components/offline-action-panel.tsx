"use client";

import type { OfflineItem } from "@/lib/offline-records";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

type Section = "overview" | "students" | "announcements" | "lessons" | "quizzes" | "attendance" | "settings";

export function OfflineActionPanel({ section, initial, onClose, onSave }: { section: Section; initial: OfflineItem | null; onClose: () => void; onSave: (draft: Omit<OfflineItem, "id" | "createdAt">) => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? defaultStatus(section));
  const isAttendance = section === "attendance";
  const label = initial ? "Edit record" : actionLabel(section);
  return <div className="fixed inset-0 z-50 flex justify-end bg-emerald-950/30"><section className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-stone-100 p-6"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Offline-ready module</p><h3 className="mt-1 font-display text-xl font-semibold">{label}</h3></div><button onClick={onClose} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"><X size={18} /></button></header><div className="flex-1 space-y-5 p-6"><div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><Sparkles className="mb-2 text-emerald-700" size={17} />This record works locally now and is ready to map to the matching Firestore collection when Firebase configuration is supplied.</div><label className="block text-sm font-bold text-stone-700">{isAttendance ? "Student name or ID" : "Title or name"}<input value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder={isAttendance ? "Student ID" : "Enter details"} /></label><label className="block text-sm font-bold text-stone-700">{isAttendance ? "Note" : "Description"}<textarea value={description} onChange={event => setDescription(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-emerald-600" placeholder="Add optional context" /></label><label className="block text-sm font-bold text-stone-700">Status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600">{(isAttendance ? ["Present", "Absent", "Late", "Excused"] : ["Draft", "Published", "Active", "Inactive"]).map(value => <option key={value}>{value}</option>)}</select></label></div><footer className="border-t border-stone-100 p-6"><button disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), description: description.trim(), status })} className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40">Save record</button></footer></section></div>;
}
function defaultStatus(section: Section) { return section === "attendance" ? "Present" : section === "students" ? "Active" : "Draft"; }
function actionLabel(section: Section) { return ({ overview: "Create record", students: "Add student", announcements: "New announcement", lessons: "New lesson", quizzes: "New quiz", attendance: "Record attendance", settings: "Configure Firebase" } as Record<Section, string>)[section]; }
