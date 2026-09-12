"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookPlus,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  Eye,
  Filter,
  Pencil,
  Send,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Metric } from "@/components/ui/metric";
import { BooleanStatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { CourseBatchPairSelect } from "@/components/course-batch-pair-select";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import {
  deleteAssignment,
  loadAssignments,
  loadAssignmentSubmissions,
  saveAssignment,
  type AssignmentRecord,
  type AssignmentSubmissionRecord,
} from "@/lib/assignment-service";
import {
  loadAllBatches,
  loadCourses,
  loadStudentProfiles,
  type BatchRecord,
  type CourseRecord,
  type StudentProfile,
} from "@/lib/course-batch-service";
import { useSingleFlight } from "@/lib/use-single-flight";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";

const assignmentsKey = ["admin", "assignments"] as const;
const coursesKey = ["admin", "courses"] as const;
const batchesKey = ["admin", "batches", "all"] as const;
const studentsKey = ["admin", "student-profiles"] as const;
const submissionsKey = ["admin", "assignment-submissions"] as const;

const toLocalInput = (iso: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const fromLocalInput = (local: string) => {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export function AssignmentManager() {
  const client = useQueryClient();
  const runSingleFlight = useSingleFlight();
  const [localAssignments, setLocalAssignments] = useState<AssignmentRecord[]>(
    []
  );
  const [localSubmissions] = useState<AssignmentSubmissionRecord[]>([]);
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRecord | null>(null);
  const [viewModal, setViewModal] = useState<AssignmentRecord | null>(null);
  const [submissionsModal, setSubmissionsModal] =
    useState<AssignmentRecord | null>(null);

  const assignmentsQuery = useQuery({
    queryKey: assignmentsKey,
    queryFn: loadAssignments,
    enabled: hasFirebaseConfiguration,
  });
  const coursesQuery = useQuery({
    queryKey: coursesKey,
    queryFn: loadCourses,
    enabled: hasFirebaseConfiguration,
  });
  const batchesQuery = useQuery({
    queryKey: batchesKey,
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const studentsQuery = useQuery({
    queryKey: studentsKey,
    queryFn: loadStudentProfiles,
    enabled: hasFirebaseConfiguration,
  });
  const submissionsQuery = useQuery({
    queryKey: submissionsKey,
    queryFn: loadAssignmentSubmissions,
    enabled: hasFirebaseConfiguration,
  });

  const assignments = hasFirebaseConfiguration
    ? (assignmentsQuery.data ?? [])
    : localAssignments;
  const courses = coursesQuery.data ?? [];
  const batches = batchesQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const submissions = hasFirebaseConfiguration
    ? (submissionsQuery.data ?? [])
    : localSubmissions;

  const saveMutation = useMutation({
    mutationFn: saveAssignment,
    onSuccess: () => client.invalidateQueries({ queryKey: assignmentsKey }),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => client.invalidateQueries({ queryKey: assignmentsKey }),
  });

  const activeCourseId = courseId || courses[0]?.id || "";
  const activeBatchId = batchId || "";

  const needle = query.trim().toLowerCase();
  const matchesStatus = (published: boolean) =>
    status === "all" || (status === "published" ? published : !published);
  const visible = assignments.filter(item => {
    const courseMatch = !courseId || item.courseId === courseId;
    const batchMatch = !batchId || item.batchId === batchId;
    const course = courses.find(c => c.id === item.courseId);
    const batch = batches.find(b => b.id === item.batchId);
    return (
      `${item.title} ${item.description} ${course?.title ?? ""} ${batch?.name ?? ""}`
        .toLowerCase()
        .includes(needle) &&
      matchesStatus(item.isPublished) &&
      courseMatch &&
      batchMatch
    );
  });

  const submissionCount = (assignmentId: string) =>
    submissions.filter(s => s.assignmentId === assignmentId).length;

  const openCreate = () => {
    setEditing(null);
    setCourseId(activeCourseId);
    setBatchId(activeBatchId);
    setFormOpen(true);
  };
  const openEdit = (item: AssignmentRecord) => {
    setEditing(item);
    setCourseId(item.courseId);
    setBatchId(item.batchId);
    setFormOpen(true);
  };

  async function saveForm(draft: Omit<AssignmentRecord, "id">) {
    const assignment = { id: editing?.id ?? crypto.randomUUID(), ...draft };
    try {
      if (hasFirebaseConfiguration) {
        await saveMutation.mutateAsync(assignment);
      } else {
        setLocalAssignments(items =>
          editing
            ? items.map(i => (i.id === assignment.id ? assignment : i))
            : [...items, assignment]
        );
      }
      setFormOpen(false);
      setEditing(null);
      toast.success(
        `${assignment.title} was ${editing ? "updated" : "created"}.`
      );
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "The assignment could not be saved. Check your connection and permissions."));
    }
  }

  async function remove(item: AssignmentRecord) {
    try {
      if (hasFirebaseConfiguration) {
        await deleteMutation.mutateAsync(item.id);
      } else {
        setLocalAssignments(items => items.filter(i => i.id !== item.id));
      }
      toast.success(`"${item.title}" was deleted.`);
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "The assignment could not be deleted."));
    }
  }
  async function toggleStatus(item: AssignmentRecord) {
    const next = { ...item, isPublished: !item.isPublished };
    try {
      if (hasFirebaseConfiguration) await saveMutation.mutateAsync(next);
      else
        setLocalAssignments(items =>
          items.map(i => (i.id === next.id ? next : i))
        );
      toast.success(
        `"${next.title}" is now ${next.isPublished ? "published" : "a draft"}.`
      );
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "The assignment status could not be updated."));
    }
  }

  const publishedTotal = assignments.filter(item => item.isPublished).length;
  const draftsTotal = assignments.length - publishedTotal;

  return (
    <>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total assignments"
          value={assignments.length}
          icon={BookPlus}
          tone="blue"
        />
        <Metric
          label="Published"
          value={publishedTotal}
          icon={CircleCheck}
          tone="green"
        />
        <Metric label="Draft" value={draftsTotal} icon={Pencil} tone="amber" />
      </div>
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        {assignmentsQuery.isError ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Could not load assignments.
          </p>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-stone-400">
            Use filters to narrow the listing.
          </span>
          <CourseBatchPairSelect
            value={{ courseId, batchId }}
            courses={courses}
            batches={batches}
            onChange={next => {
              setCourseId(next.courseId);
              setBatchId(next.batchId);
            }}
            loading={coursesQuery.isLoading || batchesQuery.isLoading}
          />
          <button
            type="button"
            onClick={() =>
              setStatus(
                status === "all"
                  ? "published"
                  : status === "published"
                    ? "draft"
                    : "all"
              )
            }
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            <Filter size={14} />
            {status === "all"
              ? "Filters"
              : `${status[0].toUpperCase()}${status.slice(1)}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setCourseId("");
              setBatchId("");
              setQuery("");
              setStatus("all");
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            <X size={14} />
            Clear all
          </button>
          <Button onClick={openCreate}>
            <BookPlus size={16} />
            Add assignment
          </Button>
        </div>
        <div>
          <DataTable
            title="Assignments"
            subtitle={`${visible.length} shown on this page`}
            searchValue={query}
            onSearchChange={setQuery}
            searchPlaceholder="Search assignments"
          >
            <thead>
              <tr>
                <Th>Assignment</Th>
                <Th>Course</Th>
                <Th>Batch</Th>
                <Th>Due</Th>
                <Th>Submissions</Th>
                <Th>Status</Th>
                <Th align="right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {assignmentsQuery.isLoading ? (
                <LoadingRow columns={7} />
              ) : visible.length ? (
                visible.map(item => {
                  const course = courses.find(c => c.id === item.courseId);
                  const batch = batches.find(b => b.id === item.batchId);
                  return (
                    <tr key={item.id} className="hover:bg-emerald-50/40">
                      <Td strong>{item.title}</Td>
                      <Td>{course?.title ?? "—"}</Td>
                      <Td>{batch?.name ?? "—"}</Td>
                      <Td>
                        {item.dueAt
                          ? new Date(item.dueAt).toLocaleDateString()
                          : "—"}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setSubmissionsModal(item)}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                        >
                          <Send size={14} />
                          {submissionCount(item.id)}
                        </button>
                      </Td>
                      <Td>
                        <BooleanStatusBadge
                          active={item.isPublished}
                          trueLabel="Published"
                          falseLabel="Draft"
                          trueTone="green"
                          falseTone="amber"
                        />
                      </Td>
                      <Td align="right">
                        <Actions
                          onView={() => setViewModal(item)}
                          onEdit={() => openEdit(item)}
                      onDelete={() => remove(item)}
                      onToggleStatus={() => toggleStatus(item)}
                          active={item.isPublished}
                          deleteTitle={`Delete "${item.title}"?`}
                          deleteDescription="This permanently removes the assignment. This cannot be undone."
                        />
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <EmptyRow
                  columns={7}
                  message="No assignments yet. Add one to get started."
                />
              )}
            </tbody>
          </DataTable>
        </div>
        {formOpen ? (
          <AssignmentForm
            assignment={editing}
            courses={courses}
            batches={batches}
            initialCourseId={activeCourseId}
            initialBatchId={activeBatchId}
            pending={saveMutation.isPending}
            onClose={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            onSubmit={draft => void runSingleFlight("save-assignment", () => saveForm(draft))}
          />
        ) : null}
        {viewModal ? (
          <AssignmentDetailsModal
            assignment={viewModal}
            course={courses.find(c => c.id === viewModal.courseId)}
            batch={batches.find(b => b.id === viewModal.batchId)}
            submissionCount={submissionCount(viewModal.id)}
            onClose={() => setViewModal(null)}
          />
        ) : null}
        {submissionsModal ? (
          <SubmissionsModal
            assignment={submissionsModal}
            submissions={submissions.filter(
              s => s.assignmentId === submissionsModal.id
            )}
            students={students}
            onClose={() => setSubmissionsModal(null)}
          />
        ) : null}
      </section>
    </>
  );
}

function Actions({
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  active,
  deleteTitle,
  deleteDescription,
}: {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onToggleStatus?: () => void | Promise<void>;
  active?: boolean;
  deleteTitle?: string;
  deleteDescription?: string;
}) {
  return (
    <RowActions
      actions={[
        { label: "View details", icon: Eye, onSelect: onView },
        { label: "Edit assignment", icon: Pencil, onSelect: onEdit },
        ...(onToggleStatus
          ? [
              {
                label: active ? "Unpublish" : "Publish",
                icon: active ? CircleX : CircleCheck,
                tone: "warning" as const,
                onSelect: onToggleStatus,
              },
            ]
          : []),
      ]}
      confirmDelete={{
        title: deleteTitle ?? "Delete this record?",
        description: deleteDescription ?? "This action cannot be undone.",
        onConfirm: onDelete,
      }}
    />
  );
}
function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th
      className={`bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500 ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}
function Td({
  children,
  strong,
  align,
}: {
  children: ReactNode;
  strong?: boolean;
  align?: "right";
}) {
  return (
    <td
      className={`border-t border-stone-100 px-5 py-4 text-stone-600 ${strong ? "font-bold text-stone-800" : ""} ${align === "right" ? "text-right" : ""}`}
    >
      {children}
    </td>
  );
}
function LoadingRow({ columns = 7 }: { columns?: number }) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="border-t border-stone-100 px-5 py-8 text-center text-stone-500"
      >
        Loading…
      </td>
    </tr>
  );
}
function EmptyRow({ columns, message }: { columns: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="border-t border-stone-100 px-5 py-8 text-center text-stone-500"
      >
        {message}
      </td>
    </tr>
  );
}

type AssignmentDraft = Omit<AssignmentRecord, "id">;
function AssignmentForm({
  assignment,
  courses,
  batches,
  initialCourseId,
  initialBatchId,
  pending,
  onClose,
  onSubmit,
}: {
  assignment: AssignmentRecord | null;
  courses: CourseRecord[];
  batches: BatchRecord[];
  initialCourseId: string;
  initialBatchId: string;
  pending: boolean;
  onClose: () => void;
  onSubmit: (draft: AssignmentDraft) => void;
}) {
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [courseId, setCourseId] = useState(
    assignment?.courseId ?? initialCourseId
  );
  const [batchId, setBatchId] = useState(assignment?.batchId ?? initialBatchId);
  const [resourceUrl, setResourceUrl] = useState(assignment?.resourceUrl ?? "");
  const [submissionInstructions, setSubmissionInstructions] = useState(
    assignment?.submissionInstructions ?? ""
  );
  const [dueAt, setDueAt] = useState(toLocalInput(assignment?.dueAt ?? ""));
  const [isPublished, setIsPublished] = useState(
    assignment?.isPublished ?? true
  );
  const selectedBatch = batches.find(
    item => item.id === batchId && item.courseId === courseId
  );
  const submit = () => {
    if (!title.trim() || !selectedBatch) return;
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      courseId,
      batchId,
      resourceUrl: resourceUrl.trim(),
      submissionInstructions: submissionInstructions.trim(),
      dueAt: fromLocalInput(dueAt),
      isPublished,
    });
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={assignment ? "Edit assignment" : "Add assignment"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <form
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Course work
            </p>
            <h4 className="mt-1 flex items-center gap-2 text-xl font-bold">
              <ClipboardCheck size={19} className="text-emerald-700" />
              {assignment ? "Edit assignment" : "Add assignment"}
            </h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <Field
          label="Title"
          value={title}
          setValue={setTitle}
          placeholder="e.g. Build a responsive homepage"
        />
        <label className="mt-4 block text-xs font-bold text-stone-700">
          Description
          <textarea
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="What should students submit?"
            className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <label className="mt-4 block text-xs font-bold text-stone-700">
          Course &amp; batch
          <CourseBatchPairSelect
            value={{ courseId, batchId }}
            courses={courses}
            batches={batches}
            ariaLabel="Course and batch"
            placeholder="Select a linked course-batch pair"
            onChange={next => {
              setCourseId(next.courseId);
              setBatchId(next.batchId);
            }}
            className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
          />
        </label>
        <label className="mt-4 block text-xs font-bold text-stone-700">
          Due date
          <input
            type="datetime-local"
            value={dueAt}
            onChange={event => setDueAt(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm"
          />
        </label>
        <Field
          label="Resource URL"
          value={resourceUrl}
          setValue={setResourceUrl}
          placeholder="https://docs.example.com"
        />
        <label className="mt-4 block text-xs font-bold text-stone-700">
          Submission instructions
          <textarea
            value={submissionInstructions}
            onChange={event => setSubmissionInstructions(event.target.value)}
            placeholder="How should students submit their work?"
            className="mt-2 min-h-20 w-full rounded-xl border border-stone-200 p-3 text-sm outline-none focus:border-emerald-600"
          />
        </label>
        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-stone-700">
            Publish to students
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublished}
            onClick={() => setIsPublished(!isPublished)}
            className={`inline-flex items-center gap-2 rounded-full px-1 py-1 text-[10px] font-bold ${isPublished ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-500"}`}
          >
            <span
              className={`size-4 rounded-full transition ${isPublished ? "bg-emerald-600" : "bg-stone-400"}`}
            />
            <span className="pr-2">{isPublished ? "Published" : "Draft"}</span>
          </button>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!title.trim() || !selectedBatch || pending}
          >
            <BookPlus size={16} />
            {pending
              ? "Saving..."
              : assignment
                ? "Save changes"
                : "Add assignment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
function Field({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="mt-4 block text-xs font-bold text-stone-700">
      {label}
      <input
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600"
      />
    </label>
  );
}
function AssignmentDetailsModal({
  assignment,
  course,
  batch,
  submissionCount: count,
  onClose,
}: {
  assignment: AssignmentRecord;
  course?: CourseRecord;
  batch?: BatchRecord;
  submissionCount: number;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assignment details"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Course work
            </p>
            <h4 className="mt-1 text-xl font-bold">{assignment.title}</h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        <dl className="mt-6 divide-y divide-stone-100 rounded-xl border border-stone-200">
          <DetailsRow label="Course" value={course?.title ?? "—"} />
          <DetailsRow label="Batch" value={batch?.name ?? "—"} />
          <DetailsRow
            label="Due"
            value={
              assignment.dueAt
                ? new Date(assignment.dueAt).toLocaleString()
                : "—"
            }
          />
          <DetailsRow
            label="Description"
            value={assignment.description || "—"}
          />
          <DetailsRow
            label="Resource URL"
            value={
              assignment.resourceUrl ? (
                <a
                  className="text-emerald-700 underline"
                  href={assignment.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {assignment.resourceUrl}
                </a>
              ) : (
                "—"
              )
            }
          />
          <DetailsRow
            label="Instructions"
            value={assignment.submissionInstructions || "—"}
          />
          <DetailsRow
            label="Status"
            value={assignment.isPublished ? "Published" : "Draft"}
          />
          <DetailsRow label="Submissions" value={String(count)} />
        </dl>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
function DetailsRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
        {label}
      </dt>
      <dd className="break-words text-sm font-medium text-stone-800 sm:col-span-2">
        {value}
      </dd>
    </div>
  );
}
function SubmissionsModal({
  assignment,
  submissions,
  students,
  onClose,
}: {
  assignment: AssignmentRecord;
  submissions: AssignmentSubmissionRecord[];
  students: StudentProfile[];
  onClose: () => void;
}) {
  const studentName = (id: string) =>
    students.find(s => s.id === id)?.name ?? "Unknown student";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assignment submissions"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Course work
            </p>
            <h4 className="mt-1 flex items-center gap-2 text-xl font-bold">
              <Send size={19} className="text-emerald-700" />
              {assignment.title}
            </h4>
            <p className="mt-1 text-xs text-stone-500">
              {submissions.length} submission
              {submissions.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </div>
        {submissions.length ? (
          <div className="mt-6 space-y-3">
            {submissions.map(item => (
              <div
                key={item.id}
                className="rounded-xl border border-stone-200 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-stone-800">
                    {studentName(item.studentId)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleString()
                      : "—"}
                  </p>
                </div>
                {item.submissionText ? (
                  <p className="mt-2 text-sm text-stone-600 break-words">
                    {item.submissionText}
                  </p>
                ) : null}
                {item.submissionUrl ? (
                  <p className="mt-2 text-xs text-emerald-700 break-words">
                    <a
                      href={item.submissionUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.submissionUrl}
                    </a>
                  </p>
                ) : null}
                {typeof item.score === "number" && (
                  <p className="mt-2 text-xs font-semibold text-stone-500">
                    Score: {item.score}
                  </p>
                )}
                {item.feedback ? (
                  <p className="mt-1 text-xs italic text-stone-500">
                    {item.feedback}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">
            No submissions yet for this assignment.
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
