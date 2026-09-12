"use client";

import type { ManagementSection, OfflineItem } from "@/lib/offline-records";
import {
  Eye,
  Filter,
  Pencil,
  Users,
  X,
  Megaphone,
  BookOpen,
  Plus,
  ClipboardCheck,
  BarChart3,
  CircleCheck,
  CircleX,
  KeyRound,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable, TablePagination } from "@/components/ui/data-table";
import {
  BooleanStatusBadge,
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { StudentResultsPanel } from "@/components/student-results-panel";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import {
  loadAllBatches,
  loadCourses,
  loadEnrollmentsPage,
} from "@/lib/course-batch-service";
import { setStudentPassword } from "@/lib/admin-student-password-service";
import { useSingleFlight } from "@/lib/use-single-flight";
import { CourseBatchPairSelect } from "@/components/course-batch-pair-select";
import {
  enrollmentMatchesScope,
  groupActiveEnrollmentsByStudent,
} from "@/lib/student-enrollment-scope";

export function ModuleRecordView({
  section,
  records,
  scopeControls,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
  onManageQuiz,
}: {
  section: ManagementSection;
  records: OfflineItem[];
  scopeControls?: ReactNode;
  onCreate: () => void;
  onEdit: (item: OfflineItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (item: OfflineItem) => void | Promise<void>;
  onManageQuiz: (item: OfflineItem) => void;
}) {
  if (section === "students")
    return (
      <StudentTable
        records={records}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    );
  if (
    section === "announcements" ||
    section === "lessons" ||
    section === "assignments"
  )
    return (
      <ContentTable
        section={section}
        records={records}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    );
  if (section === "quizzes")
    return (
      <QuizTable
        records={records}
        scopeControls={scopeControls}
        onCreate={onCreate}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        onManageQuiz={onManageQuiz}
      />
    );
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      {scopeControls ? <div className="mb-4">{scopeControls}</div> : null}
      <div className="overflow-hidden rounded-2xl border border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
                Student
              </th>
              <th className="bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
                Date
              </th>
              <th className="bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">
                Status
              </th>
              <th className="bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500" />
            </tr>
          </thead>
          <tbody>
            {records.map(item => (
              <tr key={item.id} className="border-t border-stone-100">
                <td className="px-5 py-4 font-bold text-stone-800">
                  {item.title}
                </td>
                <td className="px-5 py-4 text-stone-600">
                  {item.fields?.date || item.createdAt}
                </td>
                <td className="px-5 py-4 text-stone-600">
                  <Status value={item.status} />
                </td>
                <td className="px-5 py-4 text-stone-600">
                  <Actions
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggleStatus={onToggleStatus}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QuizTable({
  records,
  scopeControls,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
  onManageQuiz,
}: {
  records: OfflineItem[];
  scopeControls?: ReactNode;
  onCreate: () => void;
  onEdit: (item: OfflineItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (item: OfflineItem) => void | Promise<void>;
  onManageQuiz: (item: OfflineItem) => void;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-end gap-2">
        <div className="mr-auto">{scopeControls}</div>
        <Button onClick={onCreate}>
          <Plus size={16} />
          Add quiz
        </Button>
      </div>
      <DataTable title="Quizzes" subtitle={`${records.length} total`}>
        <thead>
          <tr>
            <Th>Quiz</Th>
            <Th>Marks</Th>
            <Th>Timing</Th>
            <Th>Status</Th>
            <Th align="right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {records.length ? (
            records.map(item => (
              <tr key={item.id} className="hover:bg-emerald-50/40">
                <Td strong>
                  {item.title}
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    {item.fields?.kind === "final_exam"
                      ? "Final exam"
                      : "Chapter quiz"}
                    {item.fields?.chapter ? ` · ${item.fields.chapter}` : ""}
                  </span>
                </Td>
                <Td>{item.fields?.totalMarks || "0"}</Td>
                <Td>
                  {item.fields?.kind === "final_exam"
                    ? `${item.fields?.durationMinutes || "0"} min`
                    : "Untimed"}
                </Td>
                <Td>
                  <Status value={item.status} compact />
                </Td>
                <Td align="right">
                  <RowActions
                    actions={[
                      {
                        label: "Questions & results",
                        icon: ClipboardCheck,
                        onSelect: () => onManageQuiz(item),
                      },
                      {
                        label: "Edit quiz",
                        icon: Pencil,
                        onSelect: () => onEdit(item),
                      },
                      {
                        label:
                          item.status === "Published" ? "Unpublish" : "Publish",
                        icon:
                          item.status === "Published" ? CircleX : CircleCheck,
                        tone: "warning",
                        onSelect: () => onToggleStatus(item),
                      },
                    ]}
                    confirmDelete={{
                      title: `Delete ${item.title}?`,
                      description:
                        "This permanently removes the record and cannot be undone.",
                      onConfirm: () => onDelete(item.id),
                    }}
                  />
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-10 text-center text-sm text-stone-500"
              >
                No quizzes yet. Use Add quiz above to create the first
                assessment.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
    </section>
  );
}

const CONTENT_PER_PAGE = 10;
function ContentTable({
  section,
  records,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  section: "announcements" | "lessons" | "assignments";
  records: OfflineItem[];
  onCreate: () => void;
  onEdit: (item: OfflineItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (item: OfflineItem) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [scope, setScope] = useState({ courseId: "", batchId: "" });
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<OfflineItem | null>(null);
  const coursesQuery = useQuery({
    queryKey: ["admin", "content-table-courses"],
    queryFn: loadCourses,
    enabled: hasFirebaseConfiguration,
  });
  const batchesQuery = useQuery({
    queryKey: ["admin", "content-table-batches"],
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const label =
    section === "announcements"
      ? "Announcement"
      : section === "assignments"
        ? "Assignment"
        : "Lesson";
  const Icon = section === "announcements" ? Megaphone : BookOpen;
  const courseTitle = useCallback(
    (courseId?: string) =>
      coursesQuery.data?.find(course => course.id === courseId)?.title || "—",
    [coursesQuery.data]
  );
  const batchName = useCallback(
    (batchId?: string) =>
      batchesQuery.data?.find(batch => batch.id === batchId)?.name || "—",
    [batchesQuery.data]
  );
  const filtered = useMemo(
    () =>
      records.filter(item => {
        const term = query.trim().toLowerCase();
        const searchable = [
          item.title,
          item.description,
          courseTitle(item.fields?.courseId),
          batchName(item.fields?.batchId),
        ].some(value => value?.toLowerCase().includes(term));
        const active = item.status === "Published";
        return (
          (!term || searchable) &&
          (status === "all" || (status === "active" ? active : !active)) &&
          (!scope.courseId ||
            (item.fields?.courseId === scope.courseId &&
              item.fields?.batchId === scope.batchId))
        );
      }),
    [batchName, courseTitle, query, records, scope, status]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / CONTENT_PER_PAGE));
  const activePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(
    activePage * CONTENT_PER_PAGE,
    (activePage + 1) * CONTENT_PER_PAGE
  );
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto text-xs text-stone-400">
          Search and filter {label.toLowerCase()} records.
        </span>
        <CourseBatchPairSelect
          value={scope}
          courses={coursesQuery.data ?? []}
          batches={batchesQuery.data ?? []}
          onChange={next => {
            setScope(next);
            setPage(0);
          }}
          loading={coursesQuery.isLoading || batchesQuery.isLoading}
        />
        <button
          type="button"
          onClick={() => {
            setStatus(current =>
              current === "all"
                ? "active"
                : current === "active"
                  ? "inactive"
                  : "all"
            );
            setPage(0);
          }}
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
            setQuery("");
            setStatus("all");
            setScope({ courseId: "", batchId: "" });
            setPage(0);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
        >
          <X size={14} />
          Clear all
        </button>
        <Button onClick={onCreate}>
          <Plus size={16} />
          Add {label.toLowerCase()}
        </Button>
      </div>
      <DataTable
        title={`${label}s`}
        subtitle={`${visible.length} shown on this page`}
        searchValue={query}
        onSearchChange={value => {
          setQuery(value);
          setPage(0);
        }}
        searchPlaceholder={`Search ${label.toLowerCase()}s`}
      >
        <thead>
          <tr>
            <Th>{label}</Th>
            <Th>Course / Batch</Th>
            {section === "lessons" && <Th>Resources</Th>}
            <Th>Status</Th>
            <Th align="right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {visible.length ? (
            visible.map(item => (
              <tr key={item.id} className="hover:bg-emerald-50/40">
                <Td strong>{item.title}</Td>
                <Td>
                  {courseTitle(item.fields?.courseId)}
                  <span className="mt-1 block text-xs text-stone-400">
                    {batchName(item.fields?.batchId)}
                  </span>
                  {section === "lessons" && !item.fields?.batchId ? (
                    <span className="mt-1 block text-[10px] font-bold uppercase text-amber-700">
                      Batch required
                    </span>
                  ) : null}
                </Td>
                {section === "lessons" && (
                  <Td>
                    {[
                      item.fields?.videoUrl && "Video",
                      item.fields?.pdfUrl && "PDF",
                      item.fields?.telegramUrl && "Telegram",
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </Td>
                )}
                <Td>
                  <BooleanStatusBadge
                    active={item.status === "Published"}
                    trueLabel="Published"
                    falseLabel="Draft"
                    trueTone="green"
                    falseTone="amber"
                  />
                </Td>
                <Td align="right">
                  <RowActions
                    actions={[
                      {
                        label: "View details",
                        icon: Eye,
                        onSelect: () => setViewing(item),
                      },
                      {
                        label: `Edit ${label.toLowerCase()}`,
                        icon: Pencil,
                        onSelect: () => onEdit(item),
                      },
                      {
                        label:
                          item.status === "Published" ? "Unpublish" : "Publish",
                        icon:
                          item.status === "Published" ? CircleX : CircleCheck,
                        tone: "warning",
                        onSelect: () => onToggleStatus(item),
                      },
                    ]}
                    confirmDelete={{
                      title: `Delete ${item.title}?`,
                      description:
                        "This permanently removes the record and cannot be undone.",
                      onConfirm: () => onDelete(item.id),
                    }}
                  />
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={section === "lessons" ? 6 : 5}
                className="px-4 py-10 text-center text-sm text-stone-500"
              >
                No {label.toLowerCase()} records found.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <TablePagination
        page={activePage}
        canGoNext={activePage + 1 < pageCount}
        onPrevious={() => setPage(current => Math.max(0, current - 1))}
        onNext={() => setPage(current => Math.min(pageCount - 1, current + 1))}
      />
      {viewing ? (
        <ContentDetails
          item={viewing}
          label={label}
          icon={<Icon size={16} />}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </section>
  );
}
function ContentDetails({
  item,
  label,
  icon,
  onClose,
}: {
  item: OfflineItem;
  label: string;
  icon: ReactNode;
  onClose: () => void;
}) {
  const resources =
    [
      item.fields?.videoUrl && "Video",
      item.fields?.pdfUrl && "PDF",
      item.fields?.telegramUrl && "Telegram",
    ]
      .filter(Boolean)
      .join(", ") || "—";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label} details`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              {icon}
              {label}
            </p>
            <h3 className="mt-1 text-xl font-bold">{item.title}</h3>
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
          <Detail label="Description" value={item.description || "—"} />
          <Detail label="Course" value={item.fields?.courseId || "—"} />
          <Detail label="Batch" value={item.fields?.batchId || "Unassigned"} />
          <Detail label="Resources" value={resources} />
          <Detail
            label="Status"
            value={item.status === "Published" ? "Active" : "Inactive"}
          />
        </dl>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

const STUDENTS_PER_PAGE = 10;
function StudentTable({
  records,
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  records: OfflineItem[];
  onCreate: () => void;
  onEdit: (item: OfflineItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (item: OfflineItem) => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(0);
  const [viewing, setViewing] = useState<OfflineItem | null>(null);
  const [resultsFor, setResultsFor] = useState<OfflineItem | null>(null);
  const [passwordFor, setPasswordFor] = useState<OfflineItem | null>(null);
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const coursesQuery = useQuery({
    queryKey: ["admin", "student-filter-courses"],
    queryFn: loadCourses,
    enabled: hasFirebaseConfiguration,
  });
  const batchesQuery = useQuery({
    queryKey: ["admin", "student-filter-batches"],
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["admin", "student-filter-enrollments"],
    queryFn: () => loadEnrollmentsPage(5_000),
    enabled: hasFirebaseConfiguration,
  });
  const enrollmentsByStudent = useMemo(
    () => groupActiveEnrollmentsByStudent(enrollmentsQuery.data?.items ?? []),
    [enrollmentsQuery.data]
  );
  const courseTitleById = useMemo(
    () => new Map((coursesQuery.data ?? []).map(course => [course.id, course.title])),
    [coursesQuery.data]
  );
  const batchNameById = useMemo(
    () => new Map((batchesQuery.data ?? []).map(batch => [batch.id, batch.name])),
    [batchesQuery.data]
  );
  const filtered = useMemo(
    () =>
      records.filter(item => {
        const term = query.trim().toLowerCase();
        const enrollments = enrollmentsByStudent.get(item.id) ?? [];
        return (
          (!term ||
            [
              item.title,
              item.fields?.studentId,
              item.fields?.email,
              ...enrollments.flatMap(enrollment => [
                courseTitleById.get(enrollment.courseId) || "—",
                batchNameById.get(enrollment.batchId) || "—",
              ]),
            ].some(value => value?.toLowerCase().includes(term))) &&
          (status === "all" || item.status.toLowerCase() === status) &&
          ((!courseId && !batchId) ||
            enrollmentMatchesScope(enrollments, { courseId, batchId }))
        );
      }),
    [
      batchId,
      batchNameById,
      courseId,
      courseTitleById,
      enrollmentsByStudent,
      query,
      records,
      status,
    ]
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / STUDENTS_PER_PAGE));
  const activePage = Math.min(page, pageCount - 1);
  const visibleStudents = filtered.slice(
    activePage * STUDENTS_PER_PAGE,
    (activePage + 1) * STUDENTS_PER_PAGE
  );
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <CourseBatchPairSelect
          value={{ courseId, batchId }}
          courses={coursesQuery.data ?? []}
          batches={batchesQuery.data ?? []}
          onChange={next => {
            setCourseId(next.courseId);
            setBatchId(next.batchId);
            setPage(0);
          }}
          loading={coursesQuery.isLoading || batchesQuery.isLoading}
        />
        <button
          type="button"
          onClick={() => {
            setStatus(current =>
              current === "all"
                ? "active"
                : current === "active"
                  ? "inactive"
                  : "all"
            );
            setPage(0);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
        >
          <Filter size={14} />
          {status === "all"
            ? "All statuses"
            : `${status[0].toUpperCase()}${status.slice(1)}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatus("all");
            setCourseId("");
            setBatchId("");
            setPage(0);
          }}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
        >
          <X size={14} />
          Clear all
        </button>
        <Button onClick={onCreate}>
          <Users size={16} />
          Add student
        </Button>
      </div>
      <DataTable
        title="Students"
        subtitle={`${filtered.length} matching · ${visibleStudents.length} shown`}
        searchValue={query}
        onSearchChange={value => {
          setQuery(value);
          setPage(0);
        }}
        searchPlaceholder="Search students"
      >
        <thead>
          <tr>
            <Th>Student</Th>
            <Th>Student ID</Th>
            <Th>Email</Th>
            <Th>Email verification</Th>
            <Th>Status</Th>
            <Th align="right">Action</Th>
          </tr>
        </thead>
        <tbody>
          {visibleStudents.length ? (
            visibleStudents.map(item => (
              <tr key={item.id} className="hover:bg-emerald-50/40">
                <Td strong>
                  <span className="mr-3 inline-grid size-8 place-items-center rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                    {item.title.slice(0, 1).toUpperCase()}
                  </span>
                  {item.title}
                </Td>
                <Td>{item.fields?.studentId || "—"}</Td>
                <Td>{item.fields?.email || "—"}</Td>
                <Td>
                  <EmailVerificationStatus value={item.fields?.emailVerified} />
                </Td>
                <Td>
                  <Status value={item.status} compact />
                </Td>
                <Td align="right">
                  <RowActions
                    actions={[
                      {
                        label: "View results",
                        icon: BarChart3,
                        onSelect: () => setResultsFor(item),
                      },
                      {
                        label: "View details",
                        icon: Eye,
                        onSelect: () => setViewing(item),
                      },
                      {
                        label: "Edit student",
                        icon: Pencil,
                        onSelect: () => onEdit(item),
                      },
                      {
                        label: "Change password",
                        icon: KeyRound,
                        onSelect: () => setPasswordFor(item),
                      },
                      {
                        label:
                          item.status === "Active"
                            ? "Set inactive"
                            : "Set active",
                        icon: item.status === "Active" ? CircleX : CircleCheck,
                        tone: "warning",
                        onSelect: () => onToggleStatus(item),
                      },
                    ]}
                    confirmDelete={{
                      title: `Delete ${item.title}?`,
                      description:
                        "This permanently removes the record and cannot be undone.",
                      onConfirm: () => onDelete(item.id),
                    }}
                  />
                </Td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-10 text-center text-sm text-stone-500"
              >
                No students match the selected filters.
              </td>
            </tr>
          )}
        </tbody>
      </DataTable>
      <TablePagination
        page={activePage}
        canGoNext={activePage + 1 < pageCount}
        onPrevious={() => setPage(current => Math.max(0, current - 1))}
        onNext={() => setPage(current => Math.min(pageCount - 1, current + 1))}
      />
      {viewing ? (
        <StudentDetails student={viewing} onClose={() => setViewing(null)} />
      ) : null}
      {resultsFor ? (
        <StudentResultsPanel
          studentName={resultsFor.title}
          studentUid={resultsFor.id}
          onClose={() => setResultsFor(null)}
        />
      ) : null}
      {passwordFor ? (
        <ChangePasswordModal
          student={passwordFor}
          onClose={() => setPasswordFor(null)}
        />
      ) : null}
    </section>
  );
}
function EmailVerificationStatus({ value }: { value?: string }) {
  if (value === "true")
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Verified
      </span>
    );
  if (value === "false")
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        Not verified
      </span>
    );
  return (
    <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">
      Unavailable
    </span>
  );
}
function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <th
      className={`bg-stone-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.14em] text-stone-500 ${align === "right" ? "text-right" : "text-left"}`}
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
function StudentDetails({
  student,
  onClose,
}: {
  student: OfflineItem;
  onClose: () => void;
}) {
  const verification =
    student.fields?.emailVerified === "true"
      ? "Verified"
      : student.fields?.emailVerified === "false"
        ? "Not verified"
        : "Unavailable";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Student details"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Student profile
            </p>
            <h3 className="mt-1 text-xl font-bold">{student.title}</h3>
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
          <Detail label="Student ID" value={student.fields?.studentId || "—"} />
          <Detail label="Email" value={student.fields?.email || "—"} />
          <Detail label="Email verification" value={verification} />
          <StudentEnrollments studentId={student.id} />
          <Detail label="Status" value={student.status} />
          <Detail label="Created" value={student.createdAt} />
        </dl>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
function StudentEnrollments({ studentId }: { studentId: string }) {
  const courses = useQuery({
    queryKey: ["admin", "student-filter-courses"],
    queryFn: loadCourses,
    enabled: hasFirebaseConfiguration,
  });
  const batches = useQuery({
    queryKey: ["admin", "student-filter-batches"],
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const enrollments = useQuery({
    queryKey: ["admin", "student-filter-enrollments"],
    queryFn: () => loadEnrollmentsPage(5_000),
    enabled: hasFirebaseConfiguration,
  });
  const activeEnrollments = (enrollments.data?.items ?? []).filter(
    item => item.studentId === studentId && item.status === "active"
  );
  const loading =
    enrollments.isLoading || courses.isLoading || batches.isLoading;
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
        Enrollments
      </dt>
      <dd className="break-words text-sm font-medium text-stone-800 sm:col-span-2">
        {!hasFirebaseConfiguration ? (
          "Enrollment information is unavailable offline."
        ) : loading ? (
          "Loading enrollments…"
        ) : activeEnrollments.length ? (
          <ul className="space-y-1.5">
            {activeEnrollments.map(enrollment => (
              <li key={enrollment.id}>
                {courses.data?.find(course => course.id === enrollment.courseId)
                  ?.title ?? "Course unavailable"}
                <span className="mx-1.5 text-stone-400">·</span>
                {batches.data?.find(batch => batch.id === enrollment.batchId)
                  ?.name ?? "Batch unavailable"}
              </li>
            ))}
          </ul>
        ) : (
          "No active enrollments."
        )}
      </dd>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
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
function Actions({
  item,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  item: OfflineItem;
  onEdit: (item: OfflineItem) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleStatus: (item: OfflineItem) => void | Promise<void>;
}) {
  return (
    <RowActions
      actions={[
        { label: "Edit record", icon: Pencil, onSelect: () => onEdit(item) },
        {
          label: item.status === "Present" ? "Mark absent" : "Mark present",
          icon: item.status === "Present" ? CircleX : CircleCheck,
          tone: "warning",
          onSelect: () => onToggleStatus(item),
        },
      ]}
      confirmDelete={{
        title: `Delete ${item.title}?`,
        description:
          "This permanently removes the attendance record and cannot be undone.",
        onConfirm: () => onDelete(item.id),
      }}
    />
  );
}
function Status({
  value,
  compact = false,
}: {
  value: string;
  compact?: boolean;
}) {
  const tone: StatusTone =
    value === "Active" || value === "Present" || value === "Published"
      ? "green"
      : value === "Inactive" || value === "Absent"
        ? "red"
        : value === "Draft"
          ? "amber"
          : "gray";
  return (
    <span className={compact ? "" : "mt-3 inline-flex"}>
      <StatusBadge label={value} tone={tone} />
    </span>
  );
}
function ChangePasswordModal({
  student,
  onClose,
}: {
  student: OfflineItem;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const runSingleFlight = useSingleFlight();
  const mismatch = confirm && password !== confirm;
  const tooShort = password.length > 0 && password.length < 6;
  const handleSubmit = async () => {
    if (!password.trim() || password.length < 6 || password !== confirm) return;
    await runSingleFlight("student-password", async () => {
      setPending(true);
      try {
        await setStudentPassword(student.id, password.trim());
        toast.success("Student password was updated successfully.");
        onClose();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "The password could not be changed. This student may not have a Firebase Auth account."
        );
      } finally {
        setPending(false);
      }
    });
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Change student password"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Password reset
            </p>
            <h3 className="mt-1 text-xl font-bold">{student.title}</h3>
            <p className="mt-1 text-xs text-stone-500">
              {student.fields?.email || "No email on file"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={pending}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block text-xs font-bold text-stone-700">
            New password
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Min. 6 characters"
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600"
            />
          </label>
          <label className="block text-xs font-bold text-stone-700">
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={event => setConfirm(event.target.value)}
              placeholder="Re-enter the password"
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600"
            />
          </label>
          {mismatch ? (
            <p className="text-xs font-semibold text-red-600">
              Passwords do not match.
            </p>
          ) : null}
          {tooShort ? (
            <p className="text-xs font-semibold text-amber-600">
              Password must be at least 6 characters.
            </p>
          ) : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            disabled={
              !password.trim() ||
              password.length < 6 ||
              password !== confirm ||
              pending
            }
            onClick={() => void handleSubmit()}
          >
            <KeyRound size={14} />
            {pending ? "Saving..." : "Update password"}
          </Button>
        </div>
      </div>
    </div>
  );
}
