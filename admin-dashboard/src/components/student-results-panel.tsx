"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeletonRows } from "@/components/ui/data-table";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import { formatSpentTime, loadStudentProgress } from "@/lib/student-results-service";

export function StudentResultsPanel({ studentName, studentUid, onClose }: { studentName: string; studentUid: string; onClose: () => void }) {
  const results = useQuery({ queryKey: ["admin", "student-results", studentUid], queryFn: () => loadStudentProgress(studentUid), enabled: hasFirebaseConfiguration && Boolean(studentUid) });
  const rows = results.data?.results ?? [];
  return <div role="dialog" aria-modal="true" aria-label="Student assessment results" className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4" onMouseDown={onClose}>
    <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl" onMouseDown={event => event.stopPropagation()}>
      <div className="flex items-start justify-between border-b border-stone-100 p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Student view · auto-grading</p>
          <h4 className="mt-1 text-xl font-bold">{studentName}</h4>
          <p className="mt-1 text-xs text-stone-500">Chapter quiz best scores and final-exam outcomes recorded by the server.</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 hover:bg-stone-100"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {results.data ? <div className="mb-5 space-y-4"><div className="grid gap-3 sm:grid-cols-4"><Metric label="Overall progress" value={`${results.data.progress.overallPercentage}%`} /><Metric label="Lessons" value={`${results.data.progress.completedLessons}/${results.data.progress.totalLessons}`} /><Metric label="Chapter quizzes" value={`${results.data.progress.completedChapters}/${results.data.progress.totalChapters}`} /><Metric label="Certificate" value={results.data.certificate.status === "issued" ? "Issued" : results.data.certificate.status === "eligible_pending" ? "Eligible" : "Not eligible"} /></div><div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm"><p className="font-bold text-stone-800">{results.data.profile.name} · {results.data.profile.studentCode || "No student ID"}</p><p className="mt-1 text-stone-500">{results.data.profile.email}</p><p className="mt-1 text-stone-500">{results.data.enrollment ? `${results.data.enrollment.courseTitle} · ${results.data.enrollment.batchName}` : "No active course enrollment"}</p></div></div> : null}
        {!hasFirebaseConfiguration ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Connect Firebase to view recorded scores.</p>
          : results.isLoading ? <div className="overflow-hidden rounded-2xl border border-stone-200"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-stone-50"><tr><Th>Assessment</Th><Th>Attempts</Th><Th>Best score</Th><Th>Latest %</Th><Th>Status</Th><Th>Last submitted</Th><Th align="right">Time spent</Th></tr></thead><tbody><TableSkeletonRows columns={7} rowCount={4} /></tbody></table></div>
          : results.isError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">Could not load results. Confirm this account is an administrator, then try again.</p>
          : rows.length ? <div className="overflow-hidden rounded-2xl border border-stone-200"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-stone-50"><tr><Th>Assessment</Th><Th>Attempts</Th><Th>Best score</Th><Th>Latest %</Th><Th>Status</Th><Th>Last submitted</Th><Th align="right">Time spent</Th></tr></thead><tbody>{rows.map(row => <tr key={row.quizId} className="border-t border-stone-100">
            <td className="px-5 py-4"><span className="font-bold text-stone-800">{row.quizTitle}</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">{row.kind === "final_exam" ? "Final exam" : "Chapter quiz"}{row.chapter ? ` · ${row.chapter}` : ""}</span></td>
            <td className="px-5 py-4 text-stone-600">{row.attemptCount}</td>
            <td className="px-5 py-4 text-stone-600">{row.bestPercentage}%<span className="block text-xs text-stone-400">{row.bestScore}/{row.bestTotalMarks || "—"}</span></td>
            <td className="px-5 py-4 text-stone-600">{row.latestPercentage}%</td>
            <td className="px-5 py-4"><PassBadge passed={row.passed} /></td>
            <td className="px-5 py-4 text-stone-600">{row.submittedAtMillis ? new Date(row.submittedAtMillis).toLocaleString() : "—"}</td>
            <td className="px-5 py-4 text-right text-stone-600">{formatSpentTime(row.timeSpentSeconds)}{row.kind === "final_exam" && row.integrityViolations ? <span className="block text-xs font-semibold text-amber-700">{row.integrityViolations} warning(s)</span> : null}</td>
          </tr>)}</tbody></table></div>
          : <div className="grid place-items-center gap-2 rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center"><ClipboardCheck className="size-7 text-stone-300" /><p className="text-sm font-semibold text-stone-700">No attempts recorded yet.</p><p className="max-w-xs text-xs leading-5 text-stone-500">Scores appear here after this student submits a chapter quiz or final exam.</p></div>}
      </div>
      <div className="flex justify-end border-t border-stone-100 p-4"><Button variant="outline" onClick={onClose}>Close</Button></div>
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-stone-200 bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</p><p className="mt-1 text-lg font-bold text-stone-800">{value}</p></div>;
}

function PassBadge({ passed }: { passed: boolean }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${passed ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{passed ? "Pass" : "Fail / pending"}</span>;
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return <th className={`bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500 ${align === "right" ? "text-right" : "text-left"}`}>{children}</th>;
}
