"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

import {
  uploadBannerImage,
  uploadStudentProfilePhoto,
  uploadToCloudinary,
} from "@/lib/cloudinary-upload-service";
import {
  loadAllBatches,
  loadBatches,
  loadCourses,
} from "@/lib/course-batch-service";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import type { OfflineItem } from "@/lib/offline-records";
import { useSingleFlight } from "@/lib/use-single-flight";

type Section =
  | "overview"
  | "students"
  | "announcements"
  | "lessons"
  | "assignments"
  | "quizzes"
  | "attendance"
  | "settings";
type FieldDefinition = {
  key: string;
  label: string;
  type?:
    | "text"
    | "url"
    | "number"
    | "date"
    | "datetime-local"
    | "image"
    | "select";
  options?: { value: string; label: string }[];
};

const scopedSections = [
  "announcements",
  "lessons",
  "assignments",
  "quizzes",
] as const;
const finalOnlyFields = new Set([
  "durationMinutes",
  "questionPoolTarget",
  "retakeCooldownHours",
]);
const moduleFields: Record<Section, FieldDefinition[]> = {
  overview: [],
  students: [
    { key: "email", label: "Email" },
    { key: "photoUrl", label: "Profile photo", type: "image" },
  ],
  announcements: [
    { key: "batchId", label: "Linked batch", type: "select" },
    { key: "bannerUrl", label: "Banner image", type: "image" },
  ],
  lessons: [
    { key: "thumbnailUrl", label: "Lesson thumbnail", type: "image" },
    { key: "telegramUrl", label: "Telegram URL", type: "url" },
    { key: "videoUrl", label: "Video URL", type: "url" },
    { key: "pdfUrl", label: "Lesson PDF", type: "url" },
  ],
  assignments: [
    { key: "dueAt", label: "Due at (optional)", type: "datetime-local" },
    { key: "resourceUrl", label: "Brief or resource URL", type: "url" },
    { key: "submissionInstructions", label: "Submission instructions" },
  ],
  quizzes: [
    {
      key: "kind",
      label: "Assessment type",
      type: "select",
      options: [
        {
          value: "chapter_quiz",
          label: "Chapter quiz (auto-graded, retakes allowed)",
        },
        {
          value: "final_exam",
          label: "Final exam (auto-graded, answers hidden)",
        },
      ],
    },
    { key: "chapter", label: "Chapter name or number (optional)" },
    {
      key: "durationMinutes",
      label: "Duration / time limit (minutes)",
      type: "number",
    },
    {
      key: "questionPoolTarget",
      label: "Question-bank target",
      type: "number",
    },
    {
      key: "retakeCooldownHours",
      label: "Failed retake cooldown (hours)",
      type: "number",
    },
    { key: "totalMarks", label: "Total marks", type: "number" },
    { key: "passingPercent", label: "Passing percentage", type: "number" },
    {
      key: "maxRetakes",
      label: "Max retakes (-1 = unlimited)",
      type: "number",
    },
    { key: "opensAt", label: "Opens at (optional)", type: "datetime-local" },
    { key: "closesAt", label: "Closes at (optional)", type: "datetime-local" },
  ],
  attendance: [
    { key: "courseId", label: "Course ID" },
    { key: "batchId", label: "Batch ID" },
    { key: "date", label: "Attendance date", type: "date" },
  ],
  settings: [],
};

export function OfflineActionPanel({
  section,
  initial,
  onClose,
  onSave,
}: {
  section: Section;
  initial: OfflineItem | null;
  onClose: () => void;
  onSave: (
    draft: Omit<OfflineItem, "id" | "createdAt">
  ) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(
    initial?.status ?? defaultStatus(section)
  );
  const [fields, setFields] = useState<Record<string, string>>(
    initial?.fields ?? defaultFields(section)
  );
  const [saving, setSaving] = useState(false);
  const runSingleFlight = useSingleFlight();
  const isScoped = scopedSections.includes(
    section as (typeof scopedSections)[number]
  );
  const isAnnouncement = section === "announcements";
  const isQuiz = section === "quizzes";
  const usesLinkedBatchPicker = isScoped;
  const needsCourse = hasFirebaseConfiguration && isScoped;
  const needsScope = isScoped && hasFirebaseConfiguration && !isAnnouncement;
  const courses = useQuery({
    queryKey: ["admin", "content-courses"],
    queryFn: loadCourses,
    enabled: needsCourse,
  });
  const batches = useQuery({
    queryKey: [
      "admin",
      "content-batches",
      usesLinkedBatchPicker ? "linked" : fields.courseId,
    ],
    queryFn: () =>
      usesLinkedBatchPicker
        ? loadAllBatches()
        : loadBatches(fields.courseId ?? ""),
    enabled:
      hasFirebaseConfiguration &&
      isScoped &&
      (usesLinkedBatchPicker || Boolean(fields.courseId)),
  });
  const courseById = new Map(
    (courses.data ?? []).map(course => [course.id, course])
  );
  const linkedBatches = (batches.data ?? []).filter(
    batch => Boolean(batch.courseId) && courseById.has(batch.courseId)
  );
  const selectedLinkedBatch = linkedBatches.find(
    batch => batch.id === fields.batchId && batch.courseId === fields.courseId
  );
  const quizWindowInvalid =
    isQuiz &&
    Boolean(fields.opensAt && fields.closesAt) &&
    new Date(fields.closesAt).getTime() <= new Date(fields.opensAt).getTime();
  const canSave =
    Boolean(title.trim()) &&
    (!needsCourse || Boolean(fields.courseId)) &&
    (!isScoped || Boolean(selectedLinkedBatch)) &&
    !quizWindowInvalid;
  const visibleFields = moduleFields[section]
    .filter(
      field =>
        !(
          isQuiz &&
          finalOnlyFields.has(field.key) &&
          fields.kind !== "final_exam"
        )
    )
    .map(field =>
      field.key === "batchId" && isAnnouncement
        ? {
            ...field,
            options: [
              {
                value: "",
                label: batches.isLoading
                  ? "Loading linked batches..."
                  : "Select a linked batch",
              },
              ...linkedBatches.map(batch => ({
                value: batch.id,
                label: `${batch.name} / ${courseById.get(batch.courseId)?.title ?? "Linked course"}`,
              })),
            ],
          }
        : field
    );

  const updateField = (key: string, value: string) =>
    setFields(current => {
      const batch =
        key === "batchId" && usesLinkedBatchPicker
          ? linkedBatches.find(item => item.id === value)
          : undefined;
      return key === "batchId" && usesLinkedBatchPicker
        ? { ...current, batchId: value, courseId: batch?.courseId ?? "" }
        : { ...current, [key]: value };
    });

  const save = async () => {
    await runSingleFlight("record-save", async () => {
      setSaving(true);
      try {
        await onSave({
          title: title.trim(),
          description: section === "students" ? "" : description.trim(),
          status,
          fields,
        });
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-950/30 p-4">
      <section className="max-h-[calc(100vh-2rem)] flex w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-stone-100 p-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">
              {singleLabel(section)} management
            </p>
            <h3 className="mt-1 font-display text-xl font-semibold">
              {initial
                ? `Edit ${singleLabel(section)}`
                : `New ${singleLabel(section)}`}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <Sparkles className="mb-2 text-emerald-700" size={17} />
            Published content is visible only to the selected course and batch.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-stone-700 sm:col-span-2">
              {section === "attendance"
                ? "Student name or ID"
                : section === "students"
                  ? "Student name"
                  : "Title"}
              <input
                value={title}
                onChange={event => setTitle(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600"
                placeholder="Enter details"
              />
            </label>
            {needsScope ? (
              usesLinkedBatchPicker ? (
                <label className="block text-sm font-bold text-stone-700 sm:col-span-2">
                  Course &amp; batch
                  <select
                    aria-label="Course and batch"
                    value={selectedLinkedBatch?.id ?? ""}
                    onChange={event =>
                      updateField("batchId", event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
                  >
                    <option value="">
                      {courses.isLoading || batches.isLoading
                        ? "Loading linked course-batch pairs..."
                        : "Select a linked course-batch pair"}
                    </option>
                    {linkedBatches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {courseById.get(batch.courseId)?.title} — {batch.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="block text-sm font-bold text-stone-700">
                    Course
                    <select
                      value={fields.courseId ?? ""}
                      onChange={event =>
                        setFields(current => ({
                          ...current,
                          courseId: event.target.value,
                          batchId: "",
                        }))
                      }
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
                    >
                      <option value="">
                        {courses.isLoading
                          ? "Loading courses..."
                          : "Select course"}
                      </option>
                      {(courses.data ?? []).map(course => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-bold text-stone-700">
                    Batch
                    <select
                      value={fields.batchId ?? ""}
                      onChange={event =>
                        updateField("batchId", event.target.value)
                      }
                      disabled={!fields.courseId}
                      className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal disabled:opacity-50"
                    >
                      <option value="">
                        {batches.isLoading
                          ? "Loading batches..."
                          : "Select batch"}
                      </option>
                      {(batches.data ?? []).map(batch => (
                        <option key={batch.id} value={batch.id}>
                          {batch.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )
            ) : null}
            {visibleFields.map(field =>
              field.type === "image" ? (
                <ImageField
                  key={field.key}
                  label={field.label}
                  value={fields[field.key]}
                  onUploaded={url => updateField(field.key, url)}
                />
              ) : field.type === "select" ? (
                <label
                  key={field.key}
                  className="block text-sm font-bold text-stone-700"
                >
                  <span>{field.label}</span>
                  <select
                    value={fields[field.key] ?? ""}
                    onChange={event =>
                      updateField(field.key, event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal outline-none focus:border-emerald-600"
                  >
                    {(field.options ?? []).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label
                  key={field.key}
                  className="block text-sm font-bold text-stone-700"
                >
                  <span>{field.label}</span>
                  <input
                    type={field.type ?? "text"}
                    value={fields[field.key] ?? ""}
                    onChange={event =>
                      updateField(field.key, event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm font-normal outline-none focus:border-emerald-600"
                  />
                </label>
              )
            )}
          </div>
          {section !== "students" ? (
            <label className="block text-sm font-bold text-stone-700">
              {section === "attendance" ? "Note" : "Description"}
              <textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm font-normal outline-none focus:border-emerald-600"
              />
            </label>
          ) : null}
          <label className="block text-sm font-bold text-stone-700">
            Status
            <select
              value={status}
              onChange={event => setStatus(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-normal"
            >
              {statusOptions(section).map(value => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <footer className="border-t border-stone-100 p-6">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void save()}
            className="w-full rounded-xl bg-emerald-900 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
          >
            {saving ? "Saving..." : `Save ${singleLabel(section)}`}
          </button>
          {needsScope && (!fields.courseId || !fields.batchId) ? (
            <p className="mt-2 text-center text-xs font-semibold text-amber-700">
              {isQuiz
                ? "Select a linked course-batch pair before saving."
                : "Select a linked course-batch pair before saving."}
            </p>
          ) : null}
          {quizWindowInvalid ? (
            <p className="mt-2 text-center text-xs font-semibold text-amber-700">
              Closes at must be later than Opens at, otherwise students will
              never see this {singleLabel(section).toLowerCase()}.
            </p>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

function statusOptions(section: Section) {
  return section === "attendance"
    ? ["Present", "Absent", "Late", "Excused"]
    : section === "students"
      ? ["Active", "Inactive"]
      : ["Draft", "Published"];
}
function defaultStatus(section: Section) {
  return section === "attendance"
    ? "Present"
    : section === "students"
      ? "Active"
      : "Draft";
}
function defaultFields(section: Section): Record<string, string> {
  return section === "quizzes"
    ? {
        kind: "chapter_quiz",
        passingPercent: "50",
        maxRetakes: "-1",
        questionPoolTarget: "100",
        retakeCooldownHours: "24",
      }
    : {};
}
function singleLabel(section: Section) {
  return (
    {
      overview: "Record",
      students: "Student",
      announcements: "Announcement",
      lessons: "Lesson",
      assignments: "Assignment",
      quizzes: "Quiz",
      attendance: "Attendance",
      settings: "Firebase",
    } as Record<Section, string>
  )[section];
}

function ImageField({
  label,
  value,
  onUploaded,
}: {
  label: string;
  value?: string;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runSingleFlight = useSingleFlight();
  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await runSingleFlight("image-upload", async () => {
      setUploading(true);
      setError(null);
      try {
        onUploaded(
          label === "Lesson thumbnail"
            ? await uploadToCloudinary(file, {
                kind: "image",
                folder: "coursewise/lesson-thumbnails",
              })
            : label === "Profile photo"
              ? await uploadStudentProfilePhoto(file)
              : await uploadBannerImage(file)
        );
      } catch (uploadError) {
        setError(
          uploadError instanceof Error ? uploadError.message : "Upload failed."
        );
      } finally {
        setUploading(false);
      }
    });
  }
  return (
    <div className="block text-sm font-bold text-stone-700 sm:col-span-2">
      <span>{label}</span>
      {label === "Profile photo" && value ? (
        <button
          type="button"
          onClick={() => onUploaded("")}
          className="mt-2 block text-sm font-semibold text-red-700"
        >
          Reset photo (click Save Student to apply)
        </button>
      ) : null}
      {value ? (
        // Remote previews can be Cloudinary or local object URLs selected at
        // runtime, so next/image cannot safely determine their dimensions.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 h-32 w-full rounded-xl object-cover ring-1 ring-stone-200"
        />
      ) : null}
      <label className="mt-2 flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-stone-300 px-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
        {uploading
          ? "Uploading..."
          : value
            ? "Replace image"
            : "Choose image to upload"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={handleFile}
        />
      </label>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
