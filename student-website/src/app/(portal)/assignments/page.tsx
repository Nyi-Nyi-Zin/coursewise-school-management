"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, BarChart3, CalendarDays, Check, CheckCircle2, ChevronDown,
  Clock3, ExternalLink, FileCheck2, FileText, Link2, MessageSquareText,
  Paperclip, PieChart, Search, Send, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useStudentAuth } from "@/components/student-auth-provider";
import { CourseBatchSelector, useCourseBatchSelection } from "@/components/course-batch-selector";
import {
  getPublishedAssignments, getStudentAssignmentSubmissions, submitAssignment,
  type Assignment, type AssignmentSubmission,
} from "@/lib/student-repository";
import { studentQueryKeys } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";

type AssignmentFilter = "all" | "pending" | "submitted" | "reviewed" | "upcoming";
type AssignmentSort = "due-asc" | "due-desc" | "title";
type AssignmentStatus = "pending" | "reviewed" | "needs-submission" | "upcoming";
type SelectedAssignment = { assignment: Assignment; submission?: AssignmentSubmission };

const filters: { value: AssignmentFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" }, { value: "reviewed", label: "Reviewed" },
  { value: "upcoming", label: "Upcoming" },
];

const demoAssignments: Assignment[] = [
  { id: "permissions", title: "Linux File Permissions Assignment", description: "Create users and groups, set permissions, and verify access using chmod, chown, and ls -l.", courseId: "demo-web", batchId: "demo-batch", dueAt: "2026-08-24T12:00:00.000Z", resourceUrl: "https://example.com/permissions", submissionInstructions: "Share your command output and explain the permission changes you made." },
  { id: "shell", title: "Shell Commands Practice", description: "Write commands to navigate directories, view files, and search content using grep and find.", courseId: "demo-web", batchId: "demo-batch", dueAt: "2026-08-30T12:00:00.000Z", resourceUrl: "https://example.com/shell", submissionInstructions: "Submit a link to your script or paste the commands and results below." },
  { id: "process", title: "Process Management Task", description: "List running processes, manage priorities, and stop processes using kill and nice.", courseId: "demo-web", batchId: "demo-batch", dueAt: "2026-09-02T12:00:00.000Z", submissionInstructions: "Add screenshots or notes that show each completed task." },
  { id: "bash", title: "Bash Script Exercise", description: "Write a bash script that backs up a directory and logs the timestamp.", courseId: "demo-web", batchId: "demo-batch", dueAt: "2026-09-08T12:00:00.000Z", resourceUrl: "https://example.com/bash" },
  { id: "packages", title: "Package Management Mini Project", description: "Install, update, and remove packages. Document commands and outputs.", courseId: "demo-web", batchId: "demo-batch", dueAt: "2026-09-14T12:00:00.000Z", resourceUrl: "https://example.com/packages" },
];

const demoSubmissions: AssignmentSubmission[] = [
  { id: "permissions-submission", assignmentId: "permissions", submittedAt: "2026-08-18T10:00:00.000Z", submissionText: "Completed permission exercises.", feedback: "Great job! Check the comments on permission inheritance and recursive settings.", score: 92 },
  { id: "shell-submission", assignmentId: "shell", submittedAt: "2026-08-26T08:30:00.000Z", submissionUrl: "https://example.com/my-shell-work" },
];

const emptyAssignments: Assignment[] = [];
const emptySubmissions: AssignmentSubmission[] = [];

export default function AssignmentsPage() {
  const { user } = useStudentAuth();
  const { enrollment, enrollments, enrollmentsQuery, selectionReady, selectedKey, selectEnrollment } = useCourseBatchSelection("assignments");
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const [sort, setSort] = useState<AssignmentSort>("due-asc");
  const [selected, setSelected] = useState<SelectedAssignment | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: [...studentQueryKeys.assignments, enrollment?.courseId, enrollment?.batchId],
    queryFn: () => getPublishedAssignments(enrollment?.courseId, enrollment?.batchId),
    initialData: isFirebaseConfigured ? undefined : demoAssignments,
    enabled: !isFirebaseConfigured || Boolean(selectionReady && enrollment),
  });
  const submissionsQuery = useQuery({
    queryKey: ["student", "assignment-submissions", user?.uid, enrollment?.courseId, enrollment?.batchId],
    queryFn: () => getStudentAssignmentSubmissions(user!.uid, enrollment?.courseId, enrollment?.batchId),
    initialData: isFirebaseConfigured ? undefined : demoSubmissions,
    enabled: isFirebaseConfigured ? Boolean(user?.uid && selectionReady && enrollment) : true,
  });
  const submit = useMutation({
    mutationFn: ({ assignment, text, url, file }: { assignment: Assignment; text: string; url: string; file?: File | null }) => submitAssignment(user!.uid, assignment, { submissionText: text, submissionUrl: url, submissionFile: file ?? undefined }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["student", "assignment-submissions"] });
      setSelected(null);
      toast.success("Assignment submitted.");
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Could not submit your assignment."),
  });

  const assignments = assignmentsQuery.data ?? emptyAssignments;
  const submissions = submissionsQuery.data ?? emptySubmissions;
  const submissionByAssignment = useMemo(() => new Map(submissions.map(item => [item.assignmentId, item])), [submissions]);
  const submittedCount = assignments.filter(item => submissionByAssignment.has(item.id)).length;
  const reviewedCount = assignments.filter(item => hasReview(submissionByAssignment.get(item.id))).length;
  const pendingCount = assignments.filter(item => {
    const submission = submissionByAssignment.get(item.id);
    return Boolean(submission && !hasReview(submission));
  }).length;
  const needsSubmissionCount = assignments.filter(item => getStatus(item, submissionByAssignment.get(item.id)) === "needs-submission").length;
  const upcomingCount = assignments.filter(item => getStatus(item, submissionByAssignment.get(item.id)) === "upcoming").length;
  const progress = assignments.length ? Math.round((submittedCount / assignments.length) * 100) : 0;

  const visibleAssignments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assignments.filter(assignment => {
      const submission = submissionByAssignment.get(assignment.id);
      const status = getStatus(assignment, submission);
      const matchesQuery = !normalizedQuery || `${assignment.title} ${assignment.description}`.toLowerCase().includes(normalizedQuery);
      const matchesFilter = filter === "all" || (filter === "submitted" && Boolean(submission))
        || (filter === "pending" && status === "pending") || (filter === "reviewed" && status === "reviewed")
        || (filter === "upcoming" && status === "upcoming");
      return matchesQuery && matchesFilter;
    }).sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      const direction = sort === "due-desc" ? -1 : 1;
      return (dateValue(left.dueAt) - dateValue(right.dueAt)) * direction;
    });
  }, [assignments, filter, query, sort, submissionByAssignment]);

  const feedbackItems = submissions
    .filter(item => hasReview(item))
    .map(submission => ({ submission, assignment: assignments.find(item => item.id === submission.assignmentId) }))
    .filter((item): item is { submission: AssignmentSubmission; assignment: Assignment } => Boolean(item.assignment))
    .slice(0, 3);
  const isLoading = assignmentsQuery.isLoading || submissionsQuery.isLoading;
  const hasError = enrollmentsQuery.isError || assignmentsQuery.isError || submissionsQuery.isError;

  if (isFirebaseConfigured && enrollmentsQuery.isSuccess && !enrollment) {
    return <EmptyState title="You are not enrolled in a learning batch yet." description="Ask an administrator to assign your account to a course and batch." />;
  }

  return (
    <section className="pb-2">
      <header className="text-center">
        <p className="text-sm font-semibold text-teal-700">Your course work{enrollment ? ` · ${enrollment.batchName}` : " · Demo batch"}</p>
        <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] text-slate-950">Assignments</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">View and submit your assignments. Track feedback and keep building your skills.</p>
        <CourseBatchSelector enrollments={enrollments} value={selectedKey} onChange={selectEnrollment} className="mt-4 justify-center" />
      </header>

      {hasError ? <ErrorBanner onRetry={() => { void assignmentsQuery.refetch(); void submissionsQuery.refetch(); }} /> : null}

      <div className="mt-7 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Assignment progress">
            <StatCard icon={CalendarDays} label="Total assignments" value={assignments.length} detail="Across this batch" />
            <StatCard icon={CheckCircle2} label="Submitted" value={submittedCount} detail={`${progress}% of total`} />
            <StatCard icon={Clock3} label="Pending review" value={pendingCount} detail="Awaiting feedback" />
            <StatCard icon={PieChart} label="Submission progress" value={`${progress}%`} progress={progress} />
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_7px_22px_rgba(15,23,42,0.035)] lg:grid-cols-[minmax(220px,1fr)_auto] xl:grid-cols-[minmax(200px,1fr)_auto_auto] xl:items-center">
            <label className="relative block"><span className="sr-only">Search assignments</span><Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search assignments" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100" /></label>
            <div className="flex min-w-0 overflow-x-auto rounded-xl border border-slate-200 p-0.5" aria-label="Filter assignments">
              {filters.map(item => <button key={item.value} type="button" onClick={() => setFilter(item.value)} aria-pressed={filter === item.value} className={cn("h-9 whitespace-nowrap rounded-lg px-3 text-xs font-medium transition", filter === item.value ? "bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-200" : "text-slate-600 hover:bg-slate-50")}>{item.label}</button>)}
            </div>
            <label className="relative flex items-center gap-2 text-sm font-medium text-slate-700 lg:col-span-2 xl:col-span-1"><span className="shrink-0">Sort by</span><select value={sort} onChange={event => setSort(event.target.value as AssignmentSort)} className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 xl:w-44"><option value="due-asc">Due date (soonest)</option><option value="due-desc">Due date (latest)</option><option value="title">Title</option></select><ChevronDown className="pointer-events-none absolute right-3 size-4 text-slate-400" /></label>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_22px_rgba(15,23,42,0.035)]">
            {isLoading ? Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-24 animate-pulse border-b border-slate-100 bg-slate-50 last:border-0" />) : visibleAssignments.map(assignment => <AssignmentRow key={assignment.id} assignment={assignment} number={assignments.indexOf(assignment) + 1} submission={submissionByAssignment.get(assignment.id)} onOpen={() => setSelected({ assignment, submission: submissionByAssignment.get(assignment.id) })} />)}
            {!isLoading && visibleAssignments.length === 0 ? <div className="px-6 py-14 text-center"><FileCheck2 className="mx-auto size-8 text-teal-600" /><h2 className="mt-3 font-semibold text-slate-900">No assignments found</h2><p className="mt-1 text-sm text-slate-500">Try another search term or status filter.</p></div> : null}
          </div>
        </div>

        <aside className="grid content-start gap-4 sm:grid-cols-2 xl:grid-cols-1" aria-label="Assignment insights">
          <ProgressPanel total={assignments.length} submitted={submittedCount} pending={pendingCount} reviewed={reviewedCount} needsSubmission={needsSubmissionCount} upcoming={upcomingCount} progress={progress} />
          <FeedbackPanel items={feedbackItems} onOpen={item => setSelected(item)} />
        </aside>
      </div>

      {selected ? <SubmissionDialog assignment={selected.assignment} submission={selected.submission} pending={submit.isPending} onClose={() => setSelected(null)} onSubmit={(text, url, file) => submit.mutate({ assignment: selected.assignment, text, url, file })} /> : null}
    </section>
  );
}

function StatCard({ icon: Icon, label, value, detail, progress }: { icon: typeof CalendarDays; label: string; value: string | number; detail?: string; progress?: number }) {
  return <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_7px_22px_rgba(15,23,42,0.035)] sm:min-h-28 sm:gap-4 sm:px-4 sm:py-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600 sm:size-14"><Icon className="size-5 sm:size-7" strokeWidth={1.8} /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-medium text-slate-500 sm:text-xs">{label}</p><p className="mt-0.5 text-xl font-bold leading-none text-slate-950 sm:mt-1 sm:text-2xl">{value}</p>{detail ? <p className="mt-1 text-[10px] text-slate-500 sm:mt-2 sm:text-xs">{detail}</p> : null}{typeof progress === "number" ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 sm:mt-3"><div className="h-full rounded-full bg-teal-600 transition-[width]" style={{ width: `${progress}%` }} /></div> : null}</div></div>;
}

function AssignmentRow({ assignment, number, submission, onOpen }: { assignment: Assignment; number: number; submission?: AssignmentSubmission; onOpen: () => void }) {
  const status = getStatus(assignment, submission);
  const buttonLabel = status === "reviewed" ? "View feedback" : status === "pending" ? "Update submission" : status === "needs-submission" ? "Submit work" : "Open details";
  return (
    <article className="group border-b border-slate-200 p-3.5 transition hover:bg-slate-50/70 last:border-0 sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-lg font-semibold text-teal-700">{String(number).padStart(2, "0")}</span><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600"><FileText className="size-5" /></span></div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2.5"><h2 className="text-sm font-semibold text-slate-950 sm:text-base">{assignment.title}</h2><StatusBadge status={status} /></div><p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-500 sm:text-sm">{assignment.description}</p><div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{assignment.dueAt ? `Due ${formatDate(assignment.dueAt)}` : "No due date"}</span>{assignment.resourceUrl ? <a href={assignment.resourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-teal-700"><Paperclip className="size-3.5" />Brief / resource</a> : <span className="inline-flex items-center gap-1.5"><Paperclip className="size-3.5" />No attachment</span>}{submission?.submissionUrl ? <a href={submission.submissionUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-teal-700">{submission.submissionFileName ? <FileText className="size-3.5" /> : <Link2 className="size-3.5" />}{submission.submissionFileName ? `Submission file · ${submission.submissionFileName}` : "Submission link"}</a> : null}</div></div>
        <Button type="button" size="sm" variant={status === "needs-submission" ? "default" : "outline"} onClick={onOpen} className={cn("w-full xl:w-40", status !== "needs-submission" && "border-teal-500/70 text-teal-700 hover:bg-teal-50")}>{buttonLabel}{status === "needs-submission" ? <Upload className="size-3.5" /> : null}</Button>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: AssignmentStatus }) {
  const styles = {
    pending: { label: "Pending review", icon: Clock3, className: "bg-amber-50 text-amber-700 ring-amber-200" },
    reviewed: { label: "Reviewed", icon: Check, className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    "needs-submission": { label: "Needs submission", icon: Clock3, className: "bg-blue-50 text-blue-700 ring-blue-200" },
    upcoming: { label: "Upcoming", icon: CalendarDays, className: "bg-violet-50 text-violet-700 ring-violet-200" },
  } satisfies Record<AssignmentStatus, { label: string; icon: typeof Clock3; className: string }>;
  const item = styles[status]; const Icon = item.icon;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset", item.className)}><Icon className="size-3" />{item.label}</span>;
}

function ProgressPanel({ total, submitted, pending, reviewed, needsSubmission, upcoming, progress }: { total: number; submitted: number; pending: number; reviewed: number; needsSubmission: number; upcoming: number; progress: number }) {
  const segments = [{ label: "Reviewed", value: reviewed, color: "bg-teal-500" }, { label: "Pending review", value: pending, color: "bg-amber-500" }, { label: "Needs submission", value: needsSubmission, color: "bg-sky-500" }, { label: "Upcoming", value: upcoming, color: "bg-violet-500" }];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_22px_rgba(15,23,42,0.035)]">
      <div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><BarChart3 className="size-5" /></span><div><h2 className="text-sm font-semibold text-slate-950">Submission progress</h2><p className="mt-0.5 text-xs text-slate-500">Track your assignment progress</p></div></div>
      <div className="mt-5 flex items-center gap-5"><div className="relative grid size-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#14b8a6 ${progress}%, #e2e8f0 0)` }}><div className="grid size-[76px] place-items-center rounded-full bg-white text-center"><div><p className="text-xl font-bold text-slate-950">{progress}%</p><p className="text-[10px] text-slate-500">Completed</p></div></div></div><div className="min-w-0 flex-1 space-y-2.5">{segments.map(item => <div key={item.label} className="flex items-center gap-2 text-[11px]"><span className={cn("size-2 rounded-full", item.color)} /><span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span><span className="font-semibold text-slate-800">{item.value}</span></div>)}</div></div>
      <div className="mt-5 border-t border-slate-200 pt-4 text-xs font-semibold text-teal-700">{submitted} of {total} assignments submitted <ArrowRight className="ml-1 inline size-3.5" /></div>
    </div>
  );
}

function FeedbackPanel({ items, onOpen }: { items: { assignment: Assignment; submission: AssignmentSubmission }[]; onOpen: (item: SelectedAssignment) => void }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_22px_rgba(15,23,42,0.035)]"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600"><MessageSquareText className="size-5" /></span><div><h2 className="text-sm font-semibold text-slate-950">Recent feedback</h2><p className="mt-0.5 text-xs text-slate-500">Latest notes from your instructor</p></div></div><div className="mt-4 divide-y divide-slate-200">{items.length ? items.map(item => <button key={item.submission.id} type="button" onClick={() => onOpen(item)} className="group flex w-full items-start gap-3 py-4 text-left first:pt-1"><span className="mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-600"><FileCheck2 className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900">{item.assignment.title}</span><span className="mt-1 block text-[11px] text-slate-500">Reviewed {item.submission.submittedAt ? formatDate(item.submission.submittedAt) : "recently"}</span><span className="mt-2 line-clamp-2 block text-xs leading-5 text-slate-600">{item.submission.feedback}</span></span><ArrowRight className="mt-5 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-teal-600" /></button>) : <div className="py-8 text-center"><MessageSquareText className="mx-auto size-7 text-slate-300" /><p className="mt-2 text-xs text-slate-500">Feedback will appear here after review.</p></div>}</div></div>;
}

function SubmissionDialog({ assignment, submission, pending, onClose, onSubmit }: { assignment: Assignment; submission?: AssignmentSubmission; pending: boolean; onClose: () => void; onSubmit: (text: string, url: string, file?: File | null) => void }) {
  const [text, setText] = useState(submission?.submissionText ?? ""); const [url, setUrl] = useState(submission?.submissionUrl?.startsWith("http") && !hasCloudinaryUrl(submission.submissionUrl) ? submission.submissionUrl : ""); const [file, setFile] = useState<File | null>(null); const reviewed = hasReview(submission);
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="assignment-dialog-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" /><Card className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto shadow-2xl"><CardContent className="p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">{reviewed ? "Instructor feedback" : submission ? "Update submission" : "Submit assignment"}</p><h2 id="assignment-dialog-title" className="mt-2 text-xl font-bold text-slate-950">{assignment.title}</h2></div><button type="button" onClick={onClose} className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" aria-label="Close dialog"><X className="size-4" /></button></div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{assignment.submissionInstructions || "Add a short response, a project URL, a file, or any combination."}</p>{assignment.resourceUrl ? <a href={assignment.resourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800"><ExternalLink className="size-4" />Open assignment resource</a> : null}
        {reviewed ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="size-4" />Reviewed{typeof submission?.score === "number" ? ` · ${submission.score}%` : ""}</div><p className="mt-2 text-sm leading-6 text-emerald-900/80">{submission?.feedback}</p></div> : null}
        {submission?.submissionFileName && !reviewed ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-teal-600"><FileText className="size-4" /></span><a href={submission.submissionUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 transition hover:text-teal-700">{submission.submissionFileName}</a><span className="shrink-0 text-xs font-medium text-slate-400">Uploaded</span></div> : null}
        <label className="mt-5 block text-sm font-medium text-slate-700">Response or notes<textarea value={text} onChange={event => setText(event.target.value)} placeholder="Describe your work or paste your response" className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Project link <span className="font-normal text-slate-400">(optional)</span><input value={url} onChange={event => setUrl(event.target.value)} type="url" placeholder="https://link-to-your-work.com" className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-700">Attach a file <span className="font-normal text-slate-400">(optional)</span></p>
          {file ? (
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-teal-600"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{file.name}</p><p className="text-xs text-slate-500">{formatFileSize(file.size)}</p></div><button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></button></div>
          ) : (
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-teal-400 hover:bg-teal-50/40">
              <Upload className="size-6 text-slate-400" />
              <span className="mt-2 text-sm font-medium text-slate-700">Choose a file to upload</span>
              <span className="text-xs text-slate-500">PDF, ZIP, documents, or images · up to 20 MB</span>
              <input type="file" className="sr-only" onChange={event => { const selected = event.target.files?.[0] ?? null; setFile(selected); event.target.value = ""; }} />
            </label>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button>{isFirebaseConfigured ? <Button disabled={pending || (!text.trim() && !url.trim() && !file)} onClick={() => onSubmit(text, url, file)}>{pending ? "Submitting…" : submission ? "Submit update" : "Submit work"}<Send className="size-4" /></Button> : <Button onClick={() => toast.info("Submissions are disabled in demo mode.")}>Preview submission<Send className="size-4" /></Button>}</div>
      </CardContent></Card>
    </div>
  );
}
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function hasCloudinaryUrl(value: string) {
  return /cloudinary\.com\/\S+\/coursewise\/assignments\//.test(value);
}

function getStatus(assignment: Assignment, submission?: AssignmentSubmission): AssignmentStatus {
  if (hasReview(submission)) return "reviewed"; if (submission) return "pending"; if (!assignment.dueAt) return "needs-submission";
  return dateValue(assignment.dueAt) <= Date.now() + 7 * 24 * 60 * 60 * 1000 ? "needs-submission" : "upcoming";
}
function hasReview(submission?: AssignmentSubmission) { return Boolean(submission && (submission.feedback || typeof submission.score === "number")); }
function dateValue(value?: string) { if (!value) return Number.MAX_SAFE_INTEGER; const parsed = new Date(value).getTime(); return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER; }
function formatDate(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return "Date unavailable"; return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric", timeZone: "UTC" }).format(date); }
function ErrorBanner({ onRetry }: { onRetry: () => void }) { return <Card className="mt-7 border-red-300 bg-red-50"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-red-700"><span>Assignments could not be loaded. Check your connection, then try again.</span><Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></CardContent></Card>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <section className="grid min-h-80 place-items-center text-center"><div><FileText className="mx-auto size-9 text-teal-600" /><h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1><p className="mt-2 max-w-md text-sm text-slate-500">{description}</p></div></section>; }
