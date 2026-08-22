"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookPlus, Layers3, ShieldCheck, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import { enrollStudent, loadBatches, loadCourses, saveBatch, saveCourse, type BatchRecord, type CourseRecord } from "@/lib/course-batch-service";

const coursesKey = ["admin", "courses"] as const;
const batchesKey = (courseId: string) => ["admin", "courses", courseId, "batches"] as const;

export function CourseBatchManager() {
  const client = useQueryClient();
  const [localCourses, setLocalCourses] = useState<CourseRecord[]>([]);
  const [localBatches, setLocalBatches] = useState<Record<string, BatchRecord[]>>({});
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [courseTitle, setCourseTitle] = useState(""); const [courseCode, setCourseCode] = useState("");
  const [batchName, setBatchName] = useState(""); const [studentUid, setStudentUid] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const coursesQuery = useQuery({ queryKey: coursesKey, queryFn: loadCourses, enabled: hasFirebaseConfiguration, initialData: [] as CourseRecord[] });
  const courses = hasFirebaseConfiguration ? coursesQuery.data : localCourses;
  const activeCourseId = selectedCourseId || courses[0]?.id || "";
  const batchesQuery = useQuery({ queryKey: batchesKey(activeCourseId), queryFn: () => loadBatches(activeCourseId), enabled: hasFirebaseConfiguration && Boolean(activeCourseId), initialData: [] as BatchRecord[] });
  const batches = hasFirebaseConfiguration ? batchesQuery.data : localBatches[activeCourseId] ?? [];
  const activeCourse = useMemo(() => courses.find(course => course.id === activeCourseId), [courses, activeCourseId]);

  const courseMutation = useMutation({ mutationFn: saveCourse, onSuccess: async () => client.invalidateQueries({ queryKey: coursesKey }) });
  const batchMutation = useMutation({ mutationFn: saveBatch, onSuccess: async () => client.invalidateQueries({ queryKey: batchesKey(activeCourseId) }) });
  const enrollmentMutation = useMutation({ mutationFn: ({ courseId, batchId, studentId }: { courseId: string; batchId: string; studentId: string }) => enrollStudent(courseId, batchId, studentId), onSuccess: async () => { await client.invalidateQueries({ queryKey: coursesKey }); await client.invalidateQueries({ queryKey: batchesKey(activeCourseId) }); } });

  async function createCourse() {
    if (!courseTitle.trim()) return;
    const course = { id: crypto.randomUUID(), title: courseTitle.trim(), code: courseCode.trim().toUpperCase(), isActive: true, enrolledStudentIds: [] };
    try {
      if (hasFirebaseConfiguration) await courseMutation.mutateAsync(course); else setLocalCourses(current => [...current, course]);
      setSelectedCourseId(course.id); setCourseTitle(""); setCourseCode(""); setNotice(`${course.title} is ready for batches and student enrollment.`);
    } catch { setNotice("The course could not be saved. Check the Firebase administrator role and rules."); }
  }
  async function createBatch() {
    if (!activeCourseId || !batchName.trim()) return;
    const batch = { id: crypto.randomUUID(), courseId: activeCourseId, name: batchName.trim(), isActive: true, enrolledStudentIds: [] };
    try {
      if (hasFirebaseConfiguration) await batchMutation.mutateAsync(batch); else setLocalBatches(current => ({ ...current, [activeCourseId]: [...(current[activeCourseId] ?? []), batch] }));
      setBatchName(""); setNotice(`${batch.name} was added to ${activeCourse?.title ?? "the course"}.`);
    } catch { setNotice("The batch could not be saved. Check the selected course and Firebase administrator role."); }
  }
  async function assignStudent(batch: BatchRecord) {
    if (!studentUid.trim()) return;
    const uid = studentUid.trim();
    try {
      if (hasFirebaseConfiguration) await enrollmentMutation.mutateAsync({ courseId: batch.courseId, batchId: batch.id, studentId: uid });
      else {
        setLocalCourses(current => current.map(course => course.id === batch.courseId ? { ...course, enrolledStudentIds: [...new Set([...course.enrolledStudentIds, uid])] } : course));
        setLocalBatches(current => ({ ...current, [batch.courseId]: (current[batch.courseId] ?? []).map(entry => entry.id === batch.id ? { ...entry, enrolledStudentIds: [...new Set([...entry.enrolledStudentIds, uid])] } : entry) }));
      }
      setStudentUid(""); setNotice(`Student ${uid} is now isolated to ${batch.name}.`);
    } catch { setNotice("Enrollment failed. Confirm this is a Firebase Auth UID and the administrator rules are deployed."); }
  }

  return <div className="space-y-6">
    <section className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={event => { event.preventDefault(); void createCourse(); }} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><BookPlus size={19} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Unlimited catalog</p><h3 className="mt-1 font-display text-xl font-semibold">Create a course</h3></div></div><p className="mt-3 text-sm leading-6 text-stone-500">Each course owns its own batches, student enrollments, learning content, assessments, and attendance records.</p><div className="mt-5 grid gap-3"><input value={courseTitle} onChange={event => setCourseTitle(event.target.value)} className="h-11 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder="Course title" /><input value={courseCode} onChange={event => setCourseCode(event.target.value)} className="h-11 rounded-xl border border-stone-200 px-3 text-sm uppercase outline-none focus:border-emerald-600" placeholder="Course code, e.g. WEB-101" /><Button type="submit" disabled={!courseTitle.trim() || courseMutation.isPending}><BookPlus size={16} />Add course</Button></div></form>
      <section className="rounded-3xl bg-[#143d36] p-6 text-white"><ShieldCheck className="text-[#d4f59b]" size={22} /><p className="mt-7 text-[10px] font-bold uppercase tracking-[.18em] text-[#d4f59b]/75">Batch safety model</p><h3 className="mt-2 font-display text-2xl font-semibold">Course and batch IDs are required on every protected record.</h3><p className="mt-3 text-sm leading-6 text-emerald-100/70">Students can only read a published lesson, quiz, score, or attendance row when both their Firebase UID and their active enrollment match the record’s course and batch.</p></section></section>
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Course directory</p><h3 className="mt-1 font-display text-xl font-semibold">Batches and enrollment</h3></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${hasFirebaseConfiguration ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{hasFirebaseConfiguration ? "Firestore workspace" : "Local preview"}</span></div><div className="mt-5 flex flex-wrap gap-2">{courses.length ? courses.map(course => <button key={course.id} onClick={() => setSelectedCourseId(course.id)} className={`rounded-xl px-3 py-2 text-left text-sm ${course.id === activeCourseId ? "bg-emerald-900 font-bold text-white" : "bg-stone-100 text-stone-700 hover:bg-emerald-50"}`}><span className="block">{course.title}</span><span className="mt-0.5 block text-[10px] opacity-70">{course.code || "No code"} · {course.enrolledStudentIds.length} students</span></button>) : <p className="text-sm text-stone-500">Create the first course to start adding batches.</p>}</div>{activeCourseId && <div className="mt-6 grid gap-5 lg:grid-cols-[.85fr_1.15fr]"><form onSubmit={event => { event.preventDefault(); void createBatch(); }} className="rounded-2xl bg-stone-50 p-5"><div className="flex items-center gap-2 text-emerald-800"><Layers3 size={17} /><p className="text-sm font-bold">New batch for {activeCourse?.title}</p></div><input value={batchName} onChange={event => setBatchName(event.target.value)} className="mt-4 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-emerald-600" placeholder="Batch name, e.g. Morning · Aug 2026" /><Button type="submit" className="mt-3 w-full" disabled={!batchName.trim() || batchMutation.isPending}>Add batch</Button></form><div className="space-y-3">{batches.length ? batches.map(batch => <article key={batch.id} className="rounded-2xl border border-stone-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold text-stone-800">{batch.name}</p><p className="mt-1 text-xs text-stone-500">{batch.enrolledStudentIds.length} enrolled student{batch.enrolledStudentIds.length === 1 ? "" : "s"} · {batch.isActive ? "Active" : "Inactive"}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">batchId: {batch.id.slice(0, 8)}</span></div><div className="mt-4 flex gap-2"><input value={studentUid} onChange={event => setStudentUid(event.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600" placeholder="Student Firebase Auth UID" /><Button type="button" size="sm" onClick={() => void assignStudent(batch)} disabled={!studentUid.trim() || enrollmentMutation.isPending}><UserPlus size={14} />Enroll</Button></div></article>) : <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">No batches exist yet for this course.</div>}</div></div>}{notice && <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">{notice}</p>}</section>
  </div>;
}
