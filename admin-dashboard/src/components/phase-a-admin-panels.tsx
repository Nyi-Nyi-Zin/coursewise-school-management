"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, ClipboardList, Send, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { loadBatches, loadCourses, loadStudentProfiles } from "@/lib/course-batch-service";
import { gradeCategories, loadGradeRecords, saveGradeRecord, sendInAppNotifications } from "@/lib/phase-a-service";
import type { GradeCategory, PortalNotificationKind } from "../../../shared/phase-a-contracts";

type Scope = { courseId: string; batchId: string };

function ScopePicker({ value, onChange }: { value: Scope; onChange: (next: Scope) => void }) {
  const courses = useQuery({ queryKey: ["phase-a", "courses"], queryFn: loadCourses });
  const batches = useQuery({ queryKey: ["phase-a", "batches", value.courseId], queryFn: () => loadBatches(value.courseId), enabled: Boolean(value.courseId) });
  return <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
    <label className="grid gap-1.5 text-xs font-bold text-stone-600">Course
      <select value={value.courseId} onChange={event => onChange({ courseId: event.target.value, batchId: "" })} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800">
        <option value="">Choose a course</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
      </select>
    </label>
    <label className="grid gap-1.5 text-xs font-bold text-stone-600">Batch
      <select value={value.batchId} disabled={!value.courseId} onChange={event => onChange({ ...value, batchId: event.target.value })} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        <option value="">Choose a batch</option>{batches.data?.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
      </select>
    </label>
  </div>;
}

export function GradebookPanel() {
  const [scope, setScope] = useState<Scope>({ courseId: "", batchId: "" });
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GradeCategory>("Assessment");
  const [score, setScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [feedback, setFeedback] = useState("");
  const client = useQueryClient();
  const students = useQuery({ queryKey: ["phase-a", "students"], queryFn: loadStudentProfiles });
  const batches = useQuery({ queryKey: ["phase-a", "batch-for-gradebook", scope.courseId], queryFn: () => loadBatches(scope.courseId), enabled: Boolean(scope.courseId) });
  const grades = useQuery({ queryKey: ["phase-a", "grades", scope.courseId, scope.batchId], queryFn: () => loadGradeRecords(scope.courseId, scope.batchId), enabled: Boolean(scope.courseId && scope.batchId) });
  const activeBatch = batches.data?.find(batch => batch.id === scope.batchId);
  const enrolledStudents = useMemo(() => students.data?.filter(student => activeBatch?.enrolledStudentIds.includes(student.id)) ?? [], [activeBatch?.enrolledStudentIds, students.data]);
  const save = useMutation({ mutationFn: (draft: Parameters<typeof saveGradeRecord>[0]) => saveGradeRecord(draft), onSuccess: () => { void client.invalidateQueries({ queryKey: ["phase-a", "grades", scope.courseId, scope.batchId] }); setTitle(""); setFeedback(""); setScore("0"); toast.success("Grade saved for this student."); }, onError: error => toast.error(error instanceof Error ? error.message : "The grade could not be saved.") });
  const totals = useMemo(() => grades.data?.reduce((summary, grade) => ({ earned: summary.earned + grade.score, possible: summary.possible + grade.maxScore }), { earned: 0, possible: 0 }) ?? { earned: 0, possible: 0 }, [grades.data]);

  return <div className="space-y-5">
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55"><ClipboardList size={14} />Assessment records</p><h3 className="mt-1 font-display text-2xl font-semibold">Gradebook & progress</h3><p className="mt-1 max-w-2xl text-sm text-stone-500">Record batch-scoped grades. Students can only read their own records within their active enrollment.</p></div><div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right"><p className="text-xs font-bold text-emerald-800">Batch total</p><p className="text-lg font-bold text-emerald-950">{totals.earned} / {totals.possible || 0}</p></div></div><div className="mt-5"><ScopePicker value={scope} onChange={setScope} /></div></section>
    {scope.courseId && scope.batchId ? <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]"><form onSubmit={event => { event.preventDefault(); save.mutate({ studentId, courseId: scope.courseId, batchId: scope.batchId, title, category, score: Number(score), maxScore: Number(maxScore), feedback }); }} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h4 className="font-display text-xl font-semibold">Add a grade item</h4><p className="mt-1 text-sm text-stone-500">Only students enrolled in this batch are available.</p><div className="mt-5 grid gap-4"><Field label="Student"><select required value={studentId} onChange={event => setStudentId(event.target.value)} className="input"><option value="">Choose a student</option>{enrolledStudents.map(student => <option key={student.id} value={student.id}>{student.name} · {student.studentId || student.email}</option>)}</select></Field><Field label="Grade item"><input required value={title} onChange={event => setTitle(event.target.value)} className="input" placeholder="e.g. Module 1 project" /></Field><Field label="Category"><select value={category} onChange={event => setCategory(event.target.value as GradeCategory)} className="input">{gradeCategories.map(item => <option key={item}>{item}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Score"><input required min="0" type="number" value={score} onChange={event => setScore(event.target.value)} className="input" /></Field><Field label="Maximum"><input required min="1" type="number" value={maxScore} onChange={event => setMaxScore(event.target.value)} className="input" /></Field></div><Field label="Private feedback (optional)"><textarea value={feedback} onChange={event => setFeedback(event.target.value)} className="input min-h-24 py-2.5" placeholder="Helpful feedback for this student" /></Field><button disabled={save.isPending || !enrolledStudents.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle2 size={16} />{save.isPending ? "Saving…" : "Save grade"}</button></div></form><GradeTable grades={grades.data ?? []} students={enrolledStudents} /></section> : <EmptyPanel icon={<ClipboardList size={20} />} title="Choose a course and batch" body="Select a scoped batch before creating or reviewing grade records." />}</div>;
}

export function NotificationPanel() {
  const [scope, setScope] = useState<Scope>({ courseId: "", batchId: "" });
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PortalNotificationKind>("general");
  const students = useQuery({ queryKey: ["phase-a", "students"], queryFn: loadStudentProfiles });
  const batches = useQuery({ queryKey: ["phase-a", "batch-for-notifications", scope.courseId], queryFn: () => loadBatches(scope.courseId), enabled: Boolean(scope.courseId) });
  const activeBatch = batches.data?.find(batch => batch.id === scope.batchId);
  const recipients = useMemo(() => students.data?.filter(student => activeBatch?.enrolledStudentIds.includes(student.id)) ?? [], [activeBatch?.enrolledStudentIds, students.data]);
  const send = useMutation({ mutationFn: sendInAppNotifications, onSuccess: (_, draft) => { setTitle(""); setBody(""); toast.success(`${draft.recipientIds.length} in-app notification${draft.recipientIds.length === 1 ? "" : "s"} sent.`); }, onError: error => toast.error(error instanceof Error ? error.message : "The notification could not be sent.") });
  const recipientIds = selected.length ? selected : recipients.map(student => student.id);
  return <div className="space-y-5"><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55"><BellRing size={14} />Student communications</p><h3 className="mt-1 font-display text-2xl font-semibold">In-app notifications</h3><p className="mt-1 max-w-2xl text-sm text-stone-500">Send private, batch-scoped notices to the Student Portal. This does not use browser push notifications or a billing plan.</p><div className="mt-5"><ScopePicker value={scope} onChange={next => { setScope(next); setSelected([]); }} /></div></section>{scope.courseId && scope.batchId ? <form onSubmit={event => { event.preventDefault(); send.mutate({ recipientIds, courseId: scope.courseId, batchId: scope.batchId, title, body, kind }); }} className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]"><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h4 className="font-display text-xl font-semibold">Recipients</h4><button type="button" onClick={() => setSelected(recipients.map(student => student.id))} className="text-xs font-bold text-emerald-800">Select all</button></div><p className="mt-1 text-sm text-stone-500">No selection means every active student in the batch.</p><div className="mt-4 max-h-72 space-y-2 overflow-auto pr-1">{recipients.map(student => <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-100 px-3 py-2.5 hover:bg-emerald-50"><input type="checkbox" checked={selected.includes(student.id)} onChange={event => setSelected(current => event.target.checked ? [...current, student.id] : current.filter(id => id !== student.id))} /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-stone-800">{student.name}</span><span className="block truncate text-xs text-stone-500">{student.studentId || student.email}</span></span></label>)}{!recipients.length ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No enrolled students are available in this batch.</p> : null}</div></section><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><h4 className="font-display text-xl font-semibold">Compose notice</h4><div className="mt-5 grid gap-4"><Field label="Type"><select value={kind} onChange={event => setKind(event.target.value as PortalNotificationKind)} className="input"><option value="general">General</option><option value="grade">Grade update</option><option value="attendance">Attendance</option><option value="assignment">Assignment</option></select></Field><Field label="Title"><input required value={title} onChange={event => setTitle(event.target.value)} className="input" placeholder="e.g. Gradebook updated" /></Field><Field label="Message"><textarea required value={body} onChange={event => setBody(event.target.value)} className="input min-h-32 py-2.5" placeholder="Write a helpful message for the selected students." /></Field><button disabled={send.isPending || !recipients.length} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} />{send.isPending ? "Sending…" : `Send to ${recipientIds.length || 0} student${recipientIds.length === 1 ? "" : "s"}`}</button></div></section></form> : <EmptyPanel icon={<UsersRound size={20} />} title="Choose a course and batch" body="Notifications are delivered only to the students enrolled in the selected batch." />}</div>;
}

function GradeTable({ grades, students }: { grades: Awaited<ReturnType<typeof loadGradeRecords>>; students: Awaited<ReturnType<typeof loadStudentProfiles>> }) {
  const names = new Map(students.map(student => [student.id, student.name]));
  return <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-100 p-5"><h4 className="font-display text-xl font-semibold">Recorded grades</h4><p className="mt-1 text-sm text-stone-500">Latest grades are shown first.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Item</th><th className="px-5 py-3">Category</th><th className="px-5 py-3 text-right">Score</th></tr></thead><tbody>{grades.map(grade => <tr key={grade.id} className="border-t border-stone-100"><td className="px-5 py-3 font-semibold text-stone-800">{names.get(grade.studentId) || "Student"}</td><td className="px-5 py-3"><p className="font-medium text-stone-800">{grade.title}</p>{grade.feedback ? <p className="mt-1 max-w-xs truncate text-xs text-stone-500">{grade.feedback}</p> : null}</td><td className="px-5 py-3 text-stone-500">{grade.category}</td><td className="px-5 py-3 text-right font-bold text-emerald-800">{grade.score} / {grade.maxScore}</td></tr>)}{!grades.length ? <tr><td colSpan={4} className="px-5 py-12 text-center text-sm text-stone-500">No grades have been recorded for this batch.</td></tr> : null}</tbody></table></div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-xs font-bold text-stone-600"><span>{label}</span>{children}</label>; }
function EmptyPanel({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <section className="grid min-h-56 place-items-center rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">{icon}</span><h4 className="mt-4 font-display text-xl font-semibold">{title}</h4><p className="mt-2 max-w-md text-sm leading-6 text-stone-500">{body}</p></div></section>; }
