"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  ExternalLink,
  FileText,
  Send,
  Video,
} from "lucide-react";
import { LessonStatusControl } from "@/components/lesson-status-control";
import { useLessonProgress } from "@/components/use-lesson-progress";
import { EmptyPortalState, PortalPanel } from "@/components/portal-ui";
import { useCourseBatchSelection } from "@/components/course-batch-selector";
import { studentQueryKeys } from "@/lib/student-data";
import { getLessonById } from "@/lib/student-repository";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function LessonDetailPage() {
  const { lessonId = "" } = useParams<{ lessonId: string }>();
  const { enrollment, enrollmentsQuery, selectionReady } = useCourseBatchSelection();
  const { statuses, updateStatus, updateStatusOnce } = useLessonProgress(selectionReady ? enrollment : null);
  const lessonQuery = useQuery({
    queryKey: [...studentQueryKeys.lessons, enrollment?.courseId, enrollment?.batchId, lessonId],
    queryFn: () => getLessonById(lessonId, enrollment?.courseId, enrollment?.batchId),
    enabled: Boolean(lessonId && selectionReady && enrollment),
  });

  const lesson = lessonQuery.data && statuses?.has(lessonQuery.data.id)
    ? { ...lessonQuery.data, status: statuses.get(lessonQuery.data.id)! }
    : lessonQuery.data;

  if (lessonQuery.isLoading || enrollmentsQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 pb-8">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-100" />
        <div className="h-52 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <PortalPanel>
        <EmptyPortalState
          icon={BookOpen}
          title="Lesson not found"
          description="This lesson may have been unpublished or removed by your instructor."
        />
        <div className="pb-6 text-center">
          <Link href="/lessons" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <ArrowLeft className="size-4" />Back to lessons
          </Link>
        </div>
      </PortalPanel>
    );
  }

  const resources = [
    { href: lesson.telegramUrl, label: "Telegram group", icon: Send },
    { href: lesson.videoUrl, label: "Video lesson", icon: Video },
    { href: lesson.pdfUrl, label: "PDF notes", icon: FileText },
  ].filter((resource): resource is { href: string; label: string; icon: typeof Send } => Boolean(resource.href));

  return (
    <section className="mx-auto w-full max-w-3xl pb-8">
      <Link href="/lessons" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-teal-700">
        <ArrowLeft className="size-4" />Back to lessons
      </Link>

      <article className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_22px_rgba(15,23,42,0.04)]">
        {lesson.thumbnailUrl ? (
          <div className="relative h-52 w-full overflow-hidden bg-slate-100 sm:h-64">
            <Image src={lesson.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
        ) : (
          <div className="grid h-40 w-full place-items-center bg-gradient-to-br from-teal-50 via-white to-sky-50 sm:h-52">
            <BookOpen className="size-12 text-teal-600" strokeWidth={1.5} />
          </div>
        )}

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500">
              <span className="rounded-full bg-teal-50 px-3 py-1 font-semibold text-teal-700">{lesson.module}</span>
              {lesson.duration ? <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4 text-slate-400" />{lesson.duration}</span> : null}
              <span className="inline-flex items-center gap-1.5"><BookOpen className="size-4 text-slate-400" />{resources.length} {resources.length === 1 ? "resource" : "resources"}</span>
            </div>
            <LessonStatusControl
              lessonTitle={lesson.title}
              status={lesson.status}
              disabled={!isFirebaseConfigured && !enrollment}
              pending={updateStatus.isPending}
              onChange={status => void updateStatusOnce({ lessonId: lesson.id, status })}
            />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">{lesson.title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">{lesson.description}</p>

          {resources.length ? (
            <div className="mt-7">
              <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Lesson resources</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {resources.map(resource => {
                  const Icon = resource.icon;
                  return (
                    <a
                      key={resource.label}
                      href={resource.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3.5 transition hover:border-teal-300 hover:bg-teal-50/60"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-white group-hover:text-teal-700">
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800" title={resource.label}>{resource.label}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">Open in new tab<ExternalLink className="size-3" /></span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="mt-7 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No external resources have been attached to this lesson yet.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
