"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BookMarked,
  BookPlus,
  CircleCheck,
  CircleX,
  Eye,
  Filter,
  Layers3,
  Pencil,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { DocumentSnapshot } from "firebase/firestore";
import { getUserFacingErrorMessage } from "../../../shared/user-facing-errors";
import { Button } from "@/components/ui/button";
import { DataTable, TablePagination } from "@/components/ui/data-table";
import { Metric } from "@/components/ui/metric";
import { BooleanStatusBadge } from "@/components/ui/status-badge";
import { RowActions } from "@/components/ui/row-actions";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import {
  enrollStudent,
  deleteBatch,
  deleteCourse,
  deleteEnrollment,
  linkBatchToCourse,
  loadAllBatches,
  loadAllBatchesPage,
  loadCoursesPage,
  loadEnrollmentsPage,
  loadStudentProfiles,
  saveBatch,
  saveCourse,
  saveEnrollmentStatus,
  updateEnrollmentBatch,
  type BatchRecord,
  type CourseRecord,
  type CursorPage,
  type EnrollmentRecord,
} from "@/lib/course-batch-service";
import { useSingleFlight } from "@/lib/use-single-flight";

const coursesKey = ["admin", "courses"] as const;
const studentsKey = ["admin", "student-profiles"] as const;
const batchesKey = ["admin", "batches"] as const;
const allBatchesKey = ["admin", "batches", "all"] as const;
const enrollmentsKey = ["admin", "enrollments"] as const;
const PAGE_SIZE = 10;
type Tab = "courses" | "batches" | "links" | "enrollment";

function optimisticallyReplacePagedRecord<T extends { id: string }>(
  client: QueryClient,
  queryKey: QueryKey,
  next: T
) {
  const previous = client.getQueryData<CursorPage<T>>(queryKey);
  client.setQueryData<CursorPage<T>>(queryKey, page =>
    page
      ? {
          ...page,
          items: page.items.map(item => (item.id === next.id ? next : item)),
        }
      : page
  );
  return () => client.setQueryData(queryKey, previous);
}

function optimisticallyReplaceListRecord<T extends { id: string }>(
  client: QueryClient,
  queryKey: QueryKey,
  next: T
) {
  const previous = client.getQueryData<T[]>(queryKey);
  client.setQueryData<T[]>(queryKey, current =>
    current?.map(item => (item.id === next.id ? next : item))
  );
  return () => client.setQueryData(queryKey, previous);
}

function failureNotice(error: unknown, label: string) {
  toast.error(getUserFacingErrorMessage(error, `${label}. Please retry.`));
}

export function CourseBatchManager() {
  const client = useQueryClient();
  const runSingleFlight = useSingleFlight();
  const [localCourses, setLocalCourses] = useState<CourseRecord[]>([]);
  const [localBatches, setLocalBatches] = useState<
    Record<string, BatchRecord[]>
  >({});
  const [localEnrollments, setLocalEnrollments] = useState<EnrollmentRecord[]>(
    []
  );
  const [courseId, setCourseId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [linkBatchId, setLinkBatchId] = useState("");
  const [tab, setTab] = useState<Tab>("courses");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [title, setTitle] = useState("");
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [batchName, setBatchName] = useState("");
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState<{
    title: string;
    fields: { label: string; value: ReactNode }[];
  } | null>(null);
  const [editingEnrollment, setEditingEnrollment] =
    useState<EnrollmentRecord | null>(null);
  const [coursePage, setCoursePage] = useState(0);
  const [courseCursors, setCourseCursors] = useState<
    (DocumentSnapshot | null)[]
  >([null]);
  const [batchPage, setBatchPage] = useState(0);
  const [batchCursors, setBatchCursors] = useState<(DocumentSnapshot | null)[]>(
    [null]
  );
  const [enrollmentPage, setEnrollmentPage] = useState(0);
  const [enrollmentCursors, setEnrollmentCursors] = useState<
    (DocumentSnapshot | null)[]
  >([null]);
  const coursesQuery = useQuery({
    queryKey: [...coursesKey, coursePage],
    queryFn: () => loadCoursesPage(PAGE_SIZE, courseCursors[coursePage]),
    enabled: hasFirebaseConfiguration,
  });
  const courses = useMemo(
    () =>
      hasFirebaseConfiguration
        ? (coursesQuery.data?.items ?? [])
        : localCourses,
    [coursesQuery.data, localCourses]
  );
  const activeCourseId = courseId || courses[0]?.id || "";
  const batchesQuery = useQuery({
    queryKey: [...batchesKey, batchPage],
    queryFn: () => loadAllBatchesPage(PAGE_SIZE, batchCursors[batchPage]),
    enabled: hasFirebaseConfiguration,
  });
  const batches = hasFirebaseConfiguration
    ? (batchesQuery.data?.items ?? [])
    : Object.values(localBatches).flat();
  const allBatchesQuery = useQuery({
    queryKey: allBatchesKey,
    queryFn: loadAllBatches,
    enabled: hasFirebaseConfiguration,
  });
  const studentsQuery = useQuery({
    queryKey: studentsKey,
    queryFn: loadStudentProfiles,
    enabled: hasFirebaseConfiguration,
  });
  const enrollmentsQuery = useQuery({
    queryKey: [...enrollmentsKey, enrollmentPage],
    queryFn: () =>
      loadEnrollmentsPage(PAGE_SIZE, enrollmentCursors[enrollmentPage]),
    enabled: hasFirebaseConfiguration,
  });
  const activeCourse = useMemo(
    () => courses.find(item => item.id === activeCourseId),
    [courses, activeCourseId]
  );
  const allBatches = hasFirebaseConfiguration
    ? (allBatchesQuery.data ?? [])
    : batches;
  // The link workspace is not paginated: it must show every batch linked to the selected course.
  const enrollmentBatches = allBatches.filter(
    item => item.courseId === activeCourseId
  );
  const enrollments = hasFirebaseConfiguration
    ? (enrollmentsQuery.data?.items ?? [])
    : localEnrollments;
  const needle = query.trim().toLowerCase();
  const matchesStatus = (active: boolean) =>
    status === "all" || (status === "active" ? active : !active);
  const visibleEnrollments = enrollments.filter(item => {
    const student = (studentsQuery.data ?? []).find(
      profile => profile.id === item.studentId
    );
    const batch = allBatches.find(candidate => candidate.id === item.batchId);
    return (
      `${student?.name ?? ""} ${student?.studentId ?? ""} ${batch?.name ?? ""}`
        .toLowerCase()
        .includes(needle) && matchesStatus(item.status === "active")
    );
  });
  const visibleCourses = courses.filter(
    item =>
      item.title.toLowerCase().includes(needle) && matchesStatus(item.isActive)
  );
  const visibleBatches = batches.filter(
    item =>
      item.name.toLowerCase().includes(needle) && matchesStatus(item.isActive)
  );
  const courseMutation = useMutation({
    mutationFn: saveCourse,
    onSuccess: () => client.invalidateQueries({ queryKey: coursesKey }),
  });
  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => client.invalidateQueries({ queryKey: coursesKey }),
  });
  const deleteBatchMutation = useMutation({
    mutationFn: deleteBatch,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: allBatchesKey });
    },
  });
  const batchMutation = useMutation({
    mutationFn: saveBatch,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: allBatchesKey });
    },
  });
  const linkMutation = useMutation({
    mutationFn: ({
      batchId,
      courseId,
    }: {
      batchId: string;
      courseId: string;
    }) => linkBatchToCourse(batchId, courseId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: allBatchesKey });
    },
  });
  const enrollMutation = useMutation({
    mutationFn: ({
      courseId,
      batchId,
      studentId,
    }: {
      courseId: string;
      batchId: string;
      studentId: string;
    }) => enrollStudent(courseId, batchId, studentId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: coursesKey });
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: allBatchesKey });
      await client.invalidateQueries({ queryKey: enrollmentsKey });
      await client.invalidateQueries({ queryKey: studentsKey });
    },
  });
  const enrollmentBatchMutation = useMutation({
    mutationFn: ({
      enrollment,
      nextBatchId,
    }: {
      enrollment: EnrollmentRecord;
      nextBatchId: string;
    }) => updateEnrollmentBatch(enrollment, nextBatchId),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: enrollmentsKey });
      await client.invalidateQueries({ queryKey: studentsKey });
    },
  });
  const deleteEnrollmentMutation = useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: coursesKey });
      await client.invalidateQueries({ queryKey: batchesKey });
      await client.invalidateQueries({ queryKey: allBatchesKey });
      await client.invalidateQueries({ queryKey: enrollmentsKey });
      await client.invalidateQueries({ queryKey: studentsKey });
    },
  });
  function openCourseModal(course?: CourseRecord) {
    setEditingCourseId(course?.id ?? null);
    setTitle(course?.title ?? "");
    setCourseModalOpen(true);
  }
  function openBatchModal(batch?: BatchRecord) {
    setEditingBatchId(batch?.id ?? null);
    setBatchName(batch?.name ?? "");
    setBatchModalOpen(true);
  }
  async function saveCourseForm() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const course = {
      id: editingCourseId ?? crypto.randomUUID(),
      title: nextTitle,
      isActive: editingCourseId
        ? (courses.find(item => item.id === editingCourseId)?.isActive ?? true)
        : true,
      enrolledStudentIds: editingCourseId
        ? (courses.find(item => item.id === editingCourseId)
            ?.enrolledStudentIds ?? [])
        : [],
    };
    try {
      if (hasFirebaseConfiguration) await courseMutation.mutateAsync(course);
      else
        setLocalCourses(items =>
          editingCourseId
            ? items.map(item => (item.id === editingCourseId ? course : item))
            : [...items, course]
        );
      setCourseId(course.id);
      setTitle("");
      setCourseModalOpen(false);
      setEditingCourseId(null);
      toast.success(
        `${course.title} was ${editingCourseId ? "updated" : "created"}.`
      );
    } catch (error) {
      failureNotice(error, "The course could not be saved");
    }
  }
  async function removeCourse(course: CourseRecord) {
    try {
      if (hasFirebaseConfiguration)
        await deleteCourseMutation.mutateAsync(course.id);
      else
        setLocalCourses(items => items.filter(item => item.id !== course.id));
      if (course.id === activeCourseId) {
        setCourseId("");
        setBatchId("");
      }
      toast.success(`${course.title} was deleted.`);
    } catch (error) {
      failureNotice(error, "The course could not be deleted");
    }
  }
  async function removeBatch(batch: BatchRecord) {
    try {
      if (hasFirebaseConfiguration)
        await deleteBatchMutation.mutateAsync(batch.id);
      else
        setLocalBatches(items =>
          Object.fromEntries(
            Object.entries(items).map(([key, value]) => [
              key,
              value.filter(item => item.id !== batch.id),
            ])
          )
        );
      toast.success(`${batch.name} was deleted.`);
    } catch (error) {
      failureNotice(error, "The batch could not be deleted");
    }
  }
  async function addBatch() {
    if (!batchName.trim()) return;
    const batch = {
      id: editingBatchId ?? crypto.randomUUID(),
      // Creating a batch must never implicitly assign it to the selected course.
      courseId: editingBatchId
        ? (batches.find(item => item.id === editingBatchId)?.courseId ?? "")
        : "",
      name: batchName.trim(),
      isActive: editingBatchId
        ? (batches.find(item => item.id === editingBatchId)?.isActive ?? true)
        : true,
      enrolledStudentIds: editingBatchId
        ? (batches.find(item => item.id === editingBatchId)
            ?.enrolledStudentIds ?? [])
        : [],
    };
    try {
      if (hasFirebaseConfiguration) await batchMutation.mutateAsync(batch);
      else
        setLocalBatches(items => ({
          ...items,
          [batch.courseId]: editingBatchId
            ? (items[batch.courseId] ?? []).map(item =>
                item.id === editingBatchId ? batch : item
              )
            : [...(items[batch.courseId] ?? []), batch],
        }));
      setBatchName("");
      setEditingBatchId(null);
      setBatchId(batch.id);
      setBatchModalOpen(false);
      toast.success(
        `${batch.name} was ${editingBatchId ? "updated" : "added"}.`
      );
    } catch (error) {
      failureNotice(error, "The batch could not be saved");
    }
  }
  async function linkBatch() {
    if (!activeCourseId || !linkBatchId) return;
    const batch = allBatches.find(item => item.id === linkBatchId);
    if (
      batch?.courseId &&
      batch.courseId !== activeCourseId &&
      batch.enrolledStudentIds.length
    ) {
      toast.error(
        "This batch has enrolled students and cannot be linked to another course."
      );
      return;
    }
    try {
      await linkMutation.mutateAsync({
        batchId: linkBatchId,
        courseId: activeCourseId,
      });
      setLinkBatchId("");
      toast.success("Batch linked to the selected course.");
    } catch (error) {
      failureNotice(error, "The batch could not be linked");
    }
  }
  async function enroll() {
    // Enrolment is determined by the selected batch, independently of the
    // course picker used in the batch-linking workspace.
    const selectedBatch = allBatches.find(item => item.id === batchId);
    if (!selectedBatch || !selectedBatch.courseId || !studentId) return;
    const selectedCourseId = selectedBatch.courseId;
    try {
      if (hasFirebaseConfiguration)
        await enrollMutation.mutateAsync({
          courseId: selectedCourseId,
          batchId: selectedBatch.id,
          studentId,
        });
      else
        setLocalBatches(items => ({
          ...items,
          [selectedCourseId]: (items[selectedCourseId] ?? []).map(item =>
            item.id === selectedBatch.id
              ? {
                  ...item,
                  enrolledStudentIds: [
                    ...new Set([...item.enrolledStudentIds, studentId]),
                  ],
                }
              : item
          ),
        }));
      if (!hasFirebaseConfiguration) {
        setLocalEnrollments(items =>
          items.some(
            item =>
              item.id === `${selectedCourseId}_${selectedBatch.id}_${studentId}`
          )
            ? items
            : [
                ...items,
                {
                  id: `${selectedCourseId}_${selectedBatch.id}_${studentId}`,
                  courseId: selectedCourseId,
                  batchId: selectedBatch.id,
                  studentId,
                  status: "active",
                },
              ]
        );
      }
      setStudentId("");
      setEnrollmentModalOpen(false);
      toast.success("Student enrolment updated.");
    } catch (error) {
      failureNotice(error, "Enrolment failed");
    }
  }
  async function removeEnrollment(enrollment: EnrollmentRecord) {
    try {
      if (hasFirebaseConfiguration)
        await deleteEnrollmentMutation.mutateAsync(enrollment);
      else {
        setLocalEnrollments(items =>
          items.filter(item => item.id !== enrollment.id)
        );
        setLocalBatches(items => ({
          ...items,
          [enrollment.courseId]: (items[enrollment.courseId] ?? []).map(item =>
            item.id === enrollment.batchId
              ? {
                  ...item,
                  enrolledStudentIds: item.enrolledStudentIds.filter(
                    id => id !== enrollment.studentId
                  ),
                }
              : item
          ),
        }));
        setLocalCourses(items =>
          items.map(item =>
            item.id === enrollment.courseId
              ? {
                  ...item,
                  enrolledStudentIds: item.enrolledStudentIds.filter(
                    id => id !== enrollment.studentId
                  ),
                }
              : item
          )
        );
      }
      toast.success("Student enrolment was deleted.");
    } catch (error) {
      failureNotice(error, "The enrolment could not be deleted");
    }
  }
  async function toggleCourseStatus(course: CourseRecord) {
    const next = { ...course, isActive: !course.isActive };
    const rollback = hasFirebaseConfiguration
      ? optimisticallyReplacePagedRecord(
          client,
          [...coursesKey, coursePage],
          next
        )
      : () => undefined;
    try {
      if (hasFirebaseConfiguration) await courseMutation.mutateAsync(next);
      else
        setLocalCourses(items =>
          items.map(item => (item.id === course.id ? next : item))
        );
      toast.success(
        `${course.title} is now ${next.isActive ? "active" : "inactive"}.`
      );
    } catch (error) {
      rollback();
      failureNotice(error, "The course status could not be updated");
    }
  }
  async function toggleBatchStatus(batch: BatchRecord) {
    const next = { ...batch, isActive: !batch.isActive };
    const rollbackPage = hasFirebaseConfiguration
      ? optimisticallyReplacePagedRecord(
          client,
          [...batchesKey, batchPage],
          next
        )
      : () => undefined;
    const rollbackList = hasFirebaseConfiguration
      ? optimisticallyReplaceListRecord(client, allBatchesKey, next)
      : () => undefined;
    try {
      if (hasFirebaseConfiguration) await batchMutation.mutateAsync(next);
      else
        setLocalBatches(items => ({
          ...items,
          [batch.courseId]: (items[batch.courseId] ?? []).map(item =>
            item.id === batch.id ? next : item
          ),
        }));
      toast.success(
        `${batch.name} is now ${next.isActive ? "active" : "inactive"}.`
      );
    } catch (error) {
      rollbackPage();
      rollbackList();
      failureNotice(error, "The batch status could not be updated");
    }
  }
  async function toggleEnrollmentStatus(enrollment: EnrollmentRecord) {
    const nextStatus = enrollment.status === "active" ? "inactive" : "active";
    const next = { ...enrollment, status: nextStatus };
    const rollback = hasFirebaseConfiguration
      ? optimisticallyReplacePagedRecord(
          client,
          [...enrollmentsKey, enrollmentPage],
          next
        )
      : () => undefined;
    try {
      if (hasFirebaseConfiguration)
        await saveEnrollmentStatus(
          enrollment.id,
          nextStatus as "active" | "inactive"
        );
      else
        setLocalEnrollments(items =>
          items.map(item => (item.id === enrollment.id ? next : item))
        );
      if (hasFirebaseConfiguration)
        await client.invalidateQueries({ queryKey: enrollmentsKey });
      toast.success(`Enrolment is now ${nextStatus}.`);
    } catch (error) {
      rollback();
      failureNotice(error, "The enrolment status could not be updated");
    }
  }
  async function updateEnrollmentBatchForStudent(nextBatchId: string) {
    if (!editingEnrollment) return;
    try {
      if (hasFirebaseConfiguration) {
        await enrollmentBatchMutation.mutateAsync({
          enrollment: editingEnrollment,
          nextBatchId,
        });
      } else {
        const nextEnrollment = {
          ...editingEnrollment,
          id: `${editingEnrollment.courseId}_${nextBatchId}_${editingEnrollment.studentId}`,
          batchId: nextBatchId,
        };
        setLocalEnrollments(items => [
          ...items.filter(
            item =>
              item.id !== editingEnrollment.id && item.id !== nextEnrollment.id
          ),
          nextEnrollment,
        ]);
        setLocalBatches(items => ({
          ...items,
          [activeCourseId]: (items[activeCourseId] ?? []).map(item => {
            if (item.id === editingEnrollment.batchId)
              return {
                ...item,
                enrolledStudentIds: item.enrolledStudentIds.filter(
                  id => id !== editingEnrollment.studentId
                ),
              };
            if (item.id === nextBatchId)
              return {
                ...item,
                enrolledStudentIds: [
                  ...new Set([
                    ...item.enrolledStudentIds,
                    editingEnrollment.studentId,
                  ]),
                ],
              };
            return item;
          }),
        }));
      }
      setEditingEnrollment(null);
      toast.success("Student enrolment was updated.");
    } catch (error) {
      failureNotice(error, "The enrolment could not be updated");
    }
  }
  function viewCourse(course: CourseRecord) {
    setViewModal({
      title: "Course details",
      fields: [
        { label: "Course", value: course.title },
        { label: "Status", value: course.isActive ? "Active" : "Inactive" },
        { label: "Enrolled students", value: course.enrolledStudentIds.length },
        { label: "Course ID", value: course.id },
      ],
    });
  }
  function viewBatch(batch: BatchRecord) {
    const courseName =
      courses.find(course => course.id === batch.courseId)?.title ??
      batch.courseId;
    setViewModal({
      title: "Batch details",
      fields: [
        { label: "Batch", value: batch.name },
        { label: "Course", value: courseName },
        { label: "Status", value: batch.isActive ? "Active" : "Inactive" },
        { label: "Enrolled students", value: batch.enrolledStudentIds.length },
        { label: "Batch ID", value: batch.id },
      ],
    });
  }
  function viewEnrollment(enrollment: EnrollmentRecord) {
    const student = (studentsQuery.data ?? []).find(
      profile => profile.id === enrollment.studentId
    );
    const batch = allBatches.find(
      candidate => candidate.id === enrollment.batchId
    );
    setViewModal({
      title: "Student enrolment details",
      fields: [
        { label: "Student", value: student?.name ?? "Unknown student" },
        { label: "Student ID", value: student?.studentId || "—" },
        { label: "Email", value: student?.email || "—" },
        { label: "Course", value: activeCourse?.title ?? enrollment.courseId },
        { label: "Batch", value: batch?.name ?? "Unknown batch" },
        {
          label: "Status",
          value: enrollment.status === "active" ? "Active" : "Inactive",
        },
      ],
    });
  }
  const hasCourse = Boolean(activeCourseId);
  const metricLabel =
    tab === "enrollment"
      ? "enrolments"
      : tab === "batches" || tab === "links"
        ? "batches"
        : "courses";
  const metricItems =
    tab === "enrollment"
      ? enrollments
      : tab === "batches" || tab === "links"
        ? batches
        : courses;
  const metricActive =
    tab === "enrollment"
      ? metricItems.filter(
          item => (item as EnrollmentRecord).status === "active"
        ).length
      : metricItems.filter(
          item => (item as CourseRecord | BatchRecord).isActive
        ).length;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label={`Total ${metricLabel}`}
          value={metricItems.length}
          icon={BookMarked}
          tone="blue"
        />
        <Metric
          label={`Active ${metricLabel}`}
          value={metricActive}
          icon={CircleCheck}
          tone="green"
        />
        <Metric
          label={`Inactive ${metricLabel}`}
          value={metricItems.length - metricActive}
          icon={CircleX}
          tone="red"
        />
      </div>
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        {coursesQuery.isError ? (
          <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Could not load courses.
          </p>
        ) : null}
        {enrollmentsQuery.isError ? (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            Could not load enrolments. Confirm this Firebase account has{" "}
            <code>role: admin</code> and that the current Firestore rules are
            deployed.
          </p>
        ) : null}
        <div className="mt-6 flex gap-6 overflow-x-auto border-b border-stone-200">
          {(["courses", "batches", "links", "enrollment"] as Tab[]).map(
            item => (
              <button
                key={item}
                type="button"
                disabled={
                  (item === "links" || item === "enrollment") && !hasCourse
                }
                onClick={() => {
                  setTab(item);
                  setQuery("");
                }}
                className={`shrink-0 border-b-2 px-2 pb-3 text-sm font-semibold capitalize disabled:opacity-40 ${tab === item ? "border-cyan-500 text-cyan-600" : "border-transparent text-stone-500 hover:text-stone-900"}`}
              >
                {item === "enrollment"
                  ? "Student enrolment"
                  : item === "links"
                    ? "Link batches"
                    : item}
              </button>
            )
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto text-xs text-stone-400">
            Use filters to narrow the listing.
          </span>
          <button
            type="button"
            onClick={() =>
              setStatus(
                status === "all"
                  ? "active"
                  : status === "active"
                    ? "inactive"
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
              setQuery("");
              setStatus("all");
            }}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-semibold text-stone-600 hover:bg-stone-50"
          >
            <X size={14} />
            Clear all
          </button>
          {tab === "courses" ? (
            <Button onClick={() => openCourseModal()}>
              <BookPlus size={16} />
              Add course
            </Button>
          ) : tab === "batches" ? (
            <Button onClick={() => openBatchModal()}>
              <Layers3 size={16} />
              Add batch
            </Button>
          ) : tab === "enrollment" ? (
            <Button
              onClick={() => {
                setBatchId(current => current || allBatches[0]?.id || "");
                setStudentId("");
                void client.invalidateQueries({ queryKey: studentsKey });
                setEnrollmentModalOpen(true);
              }}
              disabled={!allBatches.length}
            >
              <UserPlus size={16} />
              Enroll student
            </Button>
          ) : null}
        </div>
        {tab === "courses" ? (
          <div className="mt-5">
            <DataTable
              title="Courses"
              subtitle={`${visibleCourses.length} shown on this page`}
              onSearchChange={setQuery}
              searchValue={query}
              searchPlaceholder="Search courses"
            >
              <thead>
                <tr>
                  <Th>Course</Th>
                  <Th>Students</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {coursesQuery.isLoading ? (
                  <LoadingRow />
                ) : (
                  visibleCourses.map(item => (
                    <tr key={item.id} className="hover:bg-emerald-50/40">
                      <Td strong>{item.title}</Td>
                      <Td>
                        <UsersRound size={14} className="mr-1 inline" />
                        {item.enrolledStudentIds.length}
                      </Td>
                      <Td>
                        <BooleanStatusBadge active={item.isActive} />
                      </Td>
                      <Td align="right">
                        <Actions
                          onView={() => viewCourse(item)}
                          onEdit={() => openCourseModal(item)}
                        onDelete={() => removeCourse(item)}
                        onToggleStatus={() => toggleCourseStatus(item)}
                          active={item.isActive}
                          deleteTitle={`Delete ${item.title}?`}
                          deleteDescription="This permanently removes the course. This cannot be undone."
                        />
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
            <TablePagination
              page={coursePage}
              canGoNext={Boolean(coursesQuery.data?.nextCursor)}
              onPrevious={() => setCoursePage(page => Math.max(0, page - 1))}
              onNext={() => {
                const cursor = coursesQuery.data?.nextCursor;
                if (!cursor) return;
                setCourseCursors(cursors => {
                  const next = [...cursors];
                  next[coursePage + 1] = cursor;
                  return next;
                });
                setCoursePage(page => page + 1);
              }}
            />
          </div>
        ) : tab === "batches" ? (
          <div className="mt-5">
            <DataTable
              title={`${activeCourse?.title ?? "Course"} batches`}
              subtitle={`${visibleBatches.length} shown on this page`}
              searchValue={query}
              onSearchChange={setQuery}
              searchPlaceholder="Search batches"
            >
              <thead>
                <tr>
                  <Th>Batch</Th>
                  <Th>Course</Th>
                  <Th>Enrolled</Th>
                  <Th>Status</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {batchesQuery.isLoading ? (
                  <LoadingRow />
                ) : (
                  visibleBatches.map(item => (
                    <tr key={item.id} className="hover:bg-emerald-50/40">
                      <Td strong>{item.name}</Td>
                      <Td>
                        {courses.find(course => course.id === item.courseId)
                          ?.title ?? "Unassigned"}
                      </Td>
                      <Td>
                        <UsersRound size={14} className="mr-1 inline" />
                        {item.enrolledStudentIds.length}
                      </Td>
                      <Td>
                        <BooleanStatusBadge active={item.isActive} />
                      </Td>
                      <Td align="right">
                        <Actions
                          onView={() => viewBatch(item)}
                          onEdit={() => openBatchModal(item)}
                        onDelete={() => removeBatch(item)}
                        onToggleStatus={() => toggleBatchStatus(item)}
                          active={item.isActive}
                          deleteTitle={`Delete ${item.name}?`}
                          deleteDescription="This permanently removes the batch. This cannot be undone."
                        />
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </DataTable>
            <TablePagination
              page={batchPage}
              canGoNext={Boolean(batchesQuery.data?.nextCursor)}
              onPrevious={() => setBatchPage(page => Math.max(0, page - 1))}
              onNext={() => {
                const cursor = batchesQuery.data?.nextCursor;
                if (!cursor) return;
                setBatchCursors(cursors => {
                  const next = [...cursors];
                  next[batchPage + 1] = cursor;
                  return next;
                });
                setBatchPage(page => page + 1);
              }}
            />
          </div>
        ) : tab === "links" ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
              <p className="text-sm font-semibold text-emerald-950">
                Link a batch to a course
              </p>
              <p className="mt-1 text-sm text-emerald-900/70">
                Select the course, then choose an empty batch to link. Each
                option identifies the batch’s current course; batches with
                enrolled students cannot be linked to another course.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <select
                  aria-label="Course to link"
                  value={activeCourseId}
                  onChange={event => {
                    setCourseId(event.target.value);
                    setLinkBatchId("");
                    setBatchPage(0);
                    setBatchCursors([null]);
                  }}
                  className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm"
                >
                  <option value="">Select course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Batch to link"
                  value={linkBatchId}
                  onChange={event => setLinkBatchId(event.target.value)}
                  disabled={!activeCourseId}
                  className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {activeCourseId
                      ? "Select a batch to link"
                      : "Select course first"}
                  </option>
                  {allBatches
                    .filter(batch => batch.courseId !== activeCourseId)
                    .map(batch => {
                      const courseName =
                        courses.find(course => course.id === batch.courseId)
                          ?.title ?? "Unassigned";
                      return (
                        <option key={batch.id} value={batch.id}>
                          {batch.name} — currently in: {courseName}
                        </option>
                      );
                    })}
                </select>
                <Button
                  onClick={() => void runSingleFlight("link-batch", linkBatch)}
                  disabled={
                    !activeCourseId || !linkBatchId || linkMutation.isPending
                  }
                >
                  Link batch
                </Button>
              </div>
            </div>
            <DataTable
              title={`${activeCourse?.title ?? "Course"} batches`}
              subtitle={`${enrollmentBatches.length} batches linked to this course`}
              searchValue=""
              onSearchChange={() => undefined}
              searchPlaceholder="Search batches in this course"
            >
              <thead>
                <tr>
                  <Th>Batch</Th>
                  <Th>Status</Th>
                  <Th>Enrolled</Th>
                  <Th align="right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {enrollmentBatches.length ? (
                  enrollmentBatches.map(batch => (
                    <tr key={batch.id} className="hover:bg-emerald-50/40">
                      <Td strong>{batch.name}</Td>
                      <Td>
                        <BooleanStatusBadge active={batch.isActive} />
                      </Td>
                      <Td>{batch.enrolledStudentIds.length}</Td>
                      <Td align="right">
                        <RowActions
                          actions={[]}
                          confirmDelete={{
                            title: `Delete ${batch.name}?`,
                            description:
                              "This permanently removes the batch. This cannot be undone.",
                      onConfirm: () => removeBatch(batch),
                          }}
                        />
                      </Td>
                    </tr>
                  ))
                ) : (
                  <EmptyRow
                    columns={4}
                    message="No batches are linked to this course yet."
                  />
                )}
              </tbody>
            </DataTable>
          </div>
        ) : (
          <div className="mt-5">
            {!allBatches.length ? (
              <div className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-500">
                Add a batch first, then enrol students here.
              </div>
            ) : (
              <>
                <DataTable
                  title="Student enrolment"
                  subtitle={`${visibleEnrollments.length} shown on this page`}
                  searchValue={query}
                  onSearchChange={setQuery}
                  searchPlaceholder="Search student or batch"
                >
                  <thead>
                    <tr>
                      <Th>Student</Th>
                      <Th>Student ID</Th>
                      <Th>Batch</Th>
                      <Th>Status</Th>
                      <Th align="right">Action</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentsQuery.isLoading ? (
                      <LoadingRow columns={5} />
                    ) : enrollmentsQuery.isError ? (
                      <EmptyRow
                        columns={5}
                        message="Enrolments could not be loaded. See the message above."
                      />
                    ) : visibleEnrollments.length ? (
                      visibleEnrollments.map(item => {
                        const student = (studentsQuery.data ?? []).find(
                          profile => profile.id === item.studentId
                        );
                        const batch = allBatches.find(
                          candidate => candidate.id === item.batchId
                        );
                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/40">
                            <Td strong>{student?.name ?? "Unknown student"}</Td>
                            <Td>{student?.studentId || "—"}</Td>
                            <Td>{batch?.name ?? "Unknown batch"}</Td>
                            <Td>
                              <BooleanStatusBadge
                                active={item.status === "active"}
                              />
                            </Td>
                            <Td align="right">
                              <Actions
                                onView={() => viewEnrollment(item)}
                                onEdit={() => setEditingEnrollment(item)}
                            onDelete={() => removeEnrollment(item)}
                            onToggleStatus={() => toggleEnrollmentStatus(item)}
                                active={item.status === "active"}
                                deleteTitle="Remove this enrolment?"
                                deleteDescription={`${student?.name ?? "This student"} will lose access to the batch. This cannot be undone.`}
                              />
                            </Td>
                          </tr>
                        );
                      })
                    ) : (
                      <EmptyRow
                        columns={5}
                        message="No students enrolled yet."
                      />
                    )}
                  </tbody>
                </DataTable>
                <TablePagination
                  page={enrollmentPage}
                  canGoNext={Boolean(enrollmentsQuery.data?.nextCursor)}
                  onPrevious={() =>
                    setEnrollmentPage(page => Math.max(0, page - 1))
                  }
                  onNext={() => {
                    const cursor = enrollmentsQuery.data?.nextCursor;
                    if (!cursor) return;
                    setEnrollmentCursors(cursors => {
                      const next = [...cursors];
                      next[enrollmentPage + 1] = cursor;
                      return next;
                    });
                    setEnrollmentPage(page => page + 1);
                  }}
                />
              </>
            )}
          </div>
        )}
        {courseModalOpen ? (
          <CourseModal
            title={title}
            setTitle={setTitle}
            editing={Boolean(editingCourseId)}
            pending={courseMutation.isPending}
            onClose={() => setCourseModalOpen(false)}
            onSubmit={() => void runSingleFlight("save-course", saveCourseForm)}
          />
        ) : null}
        {batchModalOpen ? (
          <BatchModal
            name={batchName}
            setName={setBatchName}
            editing={Boolean(editingBatchId)}
            pending={batchMutation.isPending}
            onClose={() => setBatchModalOpen(false)}
            onSubmit={() => void runSingleFlight("save-batch", addBatch)}
          />
        ) : null}
        {enrollmentModalOpen ? (
          <EnrollmentModal
            batches={allBatches}
            courses={courses}
            students={studentsQuery.data ?? []}
            batchId={batchId}
            studentId={studentId}
            setBatchId={setBatchId}
            setStudentId={setStudentId}
            pending={enrollMutation.isPending}
            onClose={() => setEnrollmentModalOpen(false)}
            onSubmit={() => void runSingleFlight("enroll-student", enroll)}
          />
        ) : null}
        {viewModal ? (
          <DetailsModal {...viewModal} onClose={() => setViewModal(null)} />
        ) : null}
        {editingEnrollment ? (
          <EnrollmentBatchModal
            enrollment={editingEnrollment}
            batches={allBatches}
            courses={courses}
            students={studentsQuery.data ?? []}
            pending={enrollmentBatchMutation.isPending}
            onClose={() => setEditingEnrollment(null)}
            onSubmit={batchId => void runSingleFlight("update-enrollment-batch", () => updateEnrollmentBatchForStudent(batchId))}
          />
        ) : null}
      </section>
    </div>
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
        { label: "Edit", icon: Pencil, onSelect: onEdit },
        ...(onToggleStatus
          ? [
              {
                label: active ? "Deactivate" : "Activate",
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
function DetailsModal({
  title,
  fields,
  onClose,
}: {
  title: string;
  fields: { label: string; value: ReactNode }[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4"
      onMouseDown={onClose}
    >
      <section
        className="flex max-h-full w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Academic workspace
            </p>
            <h4 className="mt-1 font-display text-xl font-semibold">{title}</h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto rounded-2xl p-6">
          <dl className="divide-y divide-stone-100 rounded-xl border border-stone-200">
            {fields.map(field => (
              <div
                key={field.label}
                className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4"
              >
                <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  {field.label}
                </dt>
                <dd className="break-words text-sm font-medium text-stone-800 sm:col-span-2">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex justify-end border-t border-stone-100 p-6">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </section>
    </div>
  );
}
function EnrollmentBatchModal({
  enrollment,
  batches,
  courses,
  students,
  pending,
  onClose,
  onSubmit,
}: {
  enrollment: EnrollmentRecord;
  batches: BatchRecord[];
  courses: CourseRecord[];
  students: { id: string; name: string; studentId: string }[];
  pending: boolean;
  onClose: () => void;
  onSubmit: (batchId: string) => void;
}) {
  const [batchId, setBatchId] = useState(enrollment.batchId);
  const student = students.find(item => item.id === enrollment.studentId);
  const linkedBatches = batches.filter(item => Boolean(item.courseId));
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Update student enrolment"
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4"
      onMouseDown={onClose}
    >
      <form
        className="max-h-[calc(100vh-2rem)] flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          onSubmit(batchId);
        }}
      >
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Student enrolment
            </p>
            <h4 className="mt-1 font-display text-xl font-semibold">
              Update enrolment
            </h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <label className="block text-xs font-bold text-stone-700">
            Student
            <select
              value={enrollment.studentId}
              disabled
              className="mt-2 h-11 w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-100 px-3 text-sm font-normal text-stone-500"
            >
              <option value={enrollment.studentId}>
                {student
                  ? `${student.name}${student.studentId ? ` · ${student.studentId}` : ""}`
                  : "Unknown student"}
              </option>
            </select>
          </label>
          <label className="block text-xs font-bold text-stone-700">
            Batch
            <select
              value={batchId}
              onChange={event => setBatchId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
            >
              {linkedBatches.map(item => {
                const batchCourseName = courses.find(
                  course => course.id === item.courseId
                )?.title;
                return (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {batchCourseName ? ` · ${batchCourseName}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending || batchId === enrollment.batchId}
          >
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
function CourseModal({
  title,
  setTitle,
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  title: string;
  setTitle: (value: string) => void;
  editing: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit course" : "Add course"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4"
      onMouseDown={onClose}
    >
      <form
        className="max-h-[calc(100vh-2rem)] flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Academic workspace
            </p>
            <h4 className="mt-1 font-display text-xl font-semibold">
              {editing ? "Edit course" : "Add course"}
            </h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <Field
            label="Course name"
            value={title}
            setValue={setTitle}
            placeholder="e.g. Web development"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!title.trim() || pending}>
            <BookPlus size={16} />
            {editing ? "Save changes" : "Add course"}
          </Button>
        </div>
      </form>
    </div>
  );
}
function BatchModal({
  name,
  setName,
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  name: string;
  setName: (value: string) => void;
  editing: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit batch" : "Add batch"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4"
      onMouseDown={onClose}
    >
      <form
        className="max-h-[calc(100vh-2rem)] flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Academic workspace
            </p>
            <h4 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold">
              <Layers3 size={19} className="text-emerald-700" />
              {editing ? "Edit batch" : "Add a batch"}
            </h4>
            <p className="mt-1 text-xs text-stone-500">
              You can link this batch to a course later.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <Field
            label="Batch name"
            value={name}
            setValue={setName}
            placeholder="e.g. Weekend batch"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || pending}>
            {editing ? "Save batch" : "Add batch"}
          </Button>
        </div>
      </form>
    </div>
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
function LoadingRow({ columns = 5 }: { columns?: number }) {
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
function Field({
  label,
  value,
  setValue,
  placeholder,
  upper,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
  upper?: boolean;
}) {
  return (
    <label className="mt-4 block text-xs font-bold text-stone-700">
      {label}
      <input
        value={value}
        onChange={event => setValue(event.target.value)}
        placeholder={placeholder}
        className={`mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600 ${upper ? "uppercase" : ""}`}
      />
    </label>
  );
}
function EnrollmentModal({
  batches,
  courses,
  students,
  batchId,
  studentId,
  setBatchId,
  setStudentId,
  pending,
  onClose,
  onSubmit,
}: {
  batches: BatchRecord[];
  courses: CourseRecord[];
  students: {
    id: string;
    name: string;
    studentId: string;
    activeBatchId?: string;
  }[];
  batchId: string;
  studentId: string;
  setBatchId: (value: string) => void;
  setStudentId: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enroll student"
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4"
      onMouseDown={onClose}
    >
      <form
        className="max-h-[calc(100vh-2rem)] flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl"
        onMouseDown={event => event.stopPropagation()}
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              Student enrolment
            </p>
            <h4 className="mt-1 flex items-center gap-2 font-display text-xl font-semibold">
              <UserPlus size={19} className="text-emerald-700" />
              Enroll student
            </h4>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <label className="block text-xs font-bold">
            Batch
            <select
              value={batchId}
              onChange={event => {
                setBatchId(event.target.value);
                setStudentId("");
              }}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
            >
              {batches.map(item => {
                const courseName = courses.find(
                  course => course.id === item.courseId
                )?.title;
                return (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={!item.courseId}
                  >
                    {item.name}
                    {courseName
                      ? ` · ${courseName}`
                      : " · Link to a course first"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block text-xs font-bold">
            Student
            <select
              value={studentId}
              onChange={event => setStudentId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
            >
              <option value="">Select a student</option>
              {students.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.studentId ? ` · ${item.studentId}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-100 p-6">
          <Button type="submit" disabled={!studentId || pending}>
            <UserPlus size={16} />
            {pending ? "Enrolling..." : "Enroll student"}
          </Button>
        </div>
      </form>
    </div>
  );
}
