"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { loadBatches, loadCourses, loadStudentProfiles } from "@/lib/course-batch-service";
import { loadGradeRecords } from "@/lib/phase-a-service";
import { loadCertificates } from "@/lib/certificate-service";
import { loadAttendanceReport } from "@/lib/report-service";
import { downloadCsv, downloadExcelXml, printReport, type ReportColumn } from "../../../shared/report-export";

type Scope = { courseId: string; batchId: string };
type ReportKind = "grades" | "attendance" | "certificates";
type Row = Record<string, string | number>;

export function ReportsPanel() {
  const [scope, setScope] = useState<Scope>({ courseId: "", batchId: "" });
  const [kind, setKind] = useState<ReportKind>("grades");
  const courses = useQuery({ queryKey: ["reports", "courses"], queryFn: loadCourses });
  const batches = useQuery({ queryKey: ["reports", "batches", scope.courseId], queryFn: () => loadBatches(scope.courseId), enabled: Boolean(scope.courseId) });
  const students = useQuery({ queryKey: ["reports", "students"], queryFn: loadStudentProfiles });
  const grades = useQuery({ queryKey: ["reports", "grades", scope.courseId, scope.batchId], queryFn: () => loadGradeRecords(scope.courseId, scope.batchId), enabled: Boolean(scope.courseId && scope.batchId && kind === "grades") });
  const attendance = useQuery({ queryKey: ["reports", "attendance", scope.courseId, scope.batchId], queryFn: () => loadAttendanceReport(scope.courseId, scope.batchId), enabled: Boolean(scope.courseId && scope.batchId && kind === "attendance") });
  const certificates = useQuery({ queryKey: ["reports", "certificates", scope.courseId, scope.batchId], queryFn: () => loadCertificates(scope.courseId, scope.batchId), enabled: Boolean(scope.courseId && scope.batchId && kind === "certificates") });
  const activeCourse = courses.data?.find(course => course.id === scope.courseId);
  const activeBatch = batches.data?.find(batch => batch.id === scope.batchId);
  const names = useMemo(() => new Map(students.data?.map(student => [student.id, student.name]) ?? []), [students.data]);
  const definition = useMemo((): { title: string; columns: ReportColumn<Row>[]; rows: Row[] } => {
    if (kind === "attendance") return { title: "Attendance report", columns: [{ key: "student", label: "Student" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }, { key: "note", label: "Note" }], rows: (attendance.data ?? []).map(item => ({ student: names.get(item.studentId) ?? item.studentId, date: item.date, status: item.status, note: item.note })) };
    if (kind === "certificates") return { title: "Certificate registry", columns: [{ key: "student", label: "Student" }, { key: "certificate", label: "Certificate number" }, { key: "completion", label: "Completion" }, { key: "status", label: "Status" }, { key: "verification", label: "Verification code" }], rows: (certificates.data ?? []).map(item => ({ student: item.studentName, certificate: item.certificateNumber, completion: `${item.completionPercent}%`, status: item.status, verification: item.verificationCode })) };
    return { title: "Gradebook report", columns: [{ key: "student", label: "Student" }, { key: "item", label: "Grade item" }, { key: "category", label: "Category" }, { key: "score", label: "Score" }, { key: "maximum", label: "Maximum" }, { key: "percent", label: "Percent" }], rows: (grades.data ?? []).map(item => ({ student: names.get(item.studentId) ?? item.studentId, item: item.title, category: item.category, score: item.score, maximum: item.maxScore, percent: `${Math.round((item.score / item.maxScore) * 100)}%` })) };
  }, [attendance.data, certificates.data, grades.data, kind, names]);
  const canExport = Boolean(scope.courseId && scope.batchId);
  const filename = `${kind}-${scope.courseId || "course"}-${scope.batchId || "batch"}`;
  const subtitle = `${activeCourse?.title ?? "Course"} · ${activeBatch?.name ?? "Batch"}`;
  return <div className="space-y-5"><section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55"><FileSpreadsheet size={14} />Operational reporting</p><h3 className="mt-1 font-display text-2xl font-semibold">Export center</h3><p className="mt-1 max-w-2xl text-sm text-stone-500">Export only the selected course and batch. CSV and Excel-compatible files download locally; PDF uses the browser&apos;s Print / Save as PDF flow.</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Picker label="Course" value={scope.courseId} onChange={value => setScope({ courseId: value, batchId: "" })}><option value="">Choose a course</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}</Picker><Picker label="Batch" value={scope.batchId} disabled={!scope.courseId} onChange={value => setScope({ ...scope, batchId: value })}><option value="">Choose a batch</option>{batches.data?.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}</Picker><Picker label="Report" value={kind} onChange={value => setKind(value as ReportKind)}><option value="grades">Gradebook</option><option value="attendance">Attendance</option><option value="certificates">Certificate registry</option></Picker></div></section>{canExport ? <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><h4 className="font-display text-xl font-semibold">{definition.title}</h4><p className="mt-1 text-sm text-stone-500">{definition.rows.length} live record{definition.rows.length === 1 ? "" : "s"} in this scope.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => downloadCsv(filename, definition.columns, definition.rows)} className="action"><Download size={15} />CSV</button><button onClick={() => downloadExcelXml(filename, definition.title, definition.columns, definition.rows)} className="action"><FileSpreadsheet size={15} />Excel</button><button onClick={() => printReport(definition.title, subtitle, definition.columns, definition.rows)} className="action"><Printer size={15} />Print / PDF</button></div></div><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-400"><tr>{definition.columns.map(column => <th key={String(column.key)} className="px-4 py-3">{column.label}</th>)}</tr></thead><tbody>{definition.rows.slice(0, 12).map((row, index) => <tr key={index} className="border-t border-stone-100">{definition.columns.map(column => <td key={String(column.key)} className="px-4 py-3 text-stone-700">{String(row[column.key])}</td>)}</tr>)}{!definition.rows.length ? <tr><td colSpan={definition.columns.length} className="px-4 py-10 text-center text-sm text-stone-500">No records exist in this batch yet.</td></tr> : null}</tbody></table></div></section> : <section className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">Choose a course and batch to prepare a protected report.</section>}</div>;
}

function Picker({ label, value, onChange, children, disabled }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) { return <label className="grid gap-1.5 text-xs font-bold text-stone-600"><span>{label}</span><select value={value} disabled={disabled} onChange={event => onChange(event.target.value)} className="input disabled:opacity-60">{children}</select></label>; }
