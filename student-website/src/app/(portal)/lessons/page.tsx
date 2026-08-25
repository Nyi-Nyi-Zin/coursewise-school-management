"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Send, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublishedLessons } from "@/lib/student-repository";
import { demoLessons, studentQueryKeys } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useStudentCourse } from "@/components/student-course-provider";

export default function LessonsPage() {
  const { enrollment } = useStudentCourse();
  const { data: lessons = [], isLoading, isError, refetch } = useQuery({ queryKey: [...studentQueryKeys.lessons, enrollment?.courseId, enrollment?.batchId], queryFn: () => getPublishedLessons(enrollment?.courseId, enrollment?.batchId), initialData: isFirebaseConfigured ? undefined : demoLessons, enabled: !isFirebaseConfigured || Boolean(enrollment) });
  return <section><p className="text-sm font-medium text-emerald-700">Learning library{enrollment ? ` · ${enrollment.batchName}` : ""}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">Lessons</h1><p className="mt-3 max-w-2xl leading-7 text-stone-500">Explore published lesson materials assigned to your course and batch, then return to complete your quizzes.</p>{isError ? <ErrorBanner message="Lessons could not be loaded." onRetry={() => void refetch()} /> : null}<div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-64 animate-pulse bg-stone-100" />) : lessons.map((lesson) => <Card key={lesson.id} className="group overflow-hidden"><div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" /><CardContent className="p-6">{lesson.thumbnailUrl ? <img src={lesson.thumbnailUrl} alt="" className="mb-5 aspect-video w-full rounded-xl object-cover" /> : null}<div className="flex items-center justify-between"><Badge>{lesson.module}</Badge>{lesson.duration ? <span className="text-xs text-stone-500">{lesson.duration}</span> : null}</div><h2 className="mt-6 text-lg font-semibold text-stone-900">{lesson.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{lesson.description}</p><div className="mt-6 flex gap-4"><ResourceLink href={lesson.telegramUrl} icon={Send} label="Telegram" /><ResourceLink href={lesson.videoUrl} icon={Video} label="Video" /><ResourceLink href={lesson.pdfUrl} icon={FileText} label="PDF" /></div></CardContent></Card>)}</div>{isFirebaseConfigured && !enrollment && !isLoading ? <EmptyState title="You are not assigned to a learning batch yet." description="Ask an administrator to enroll your Firebase account in a course and batch." /> : !isError && !isLoading && lessons.length === 0 ? <EmptyState title="No lessons have been published yet." description="Your instructor will add learning material here." /> : null}</section>;
}

function ResourceLink({ href, icon: Icon, label }: { href?: string; icon: typeof Send; label: string }) {
  if (!href) return <span className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-400">{Icon && <Icon className="size-4" />}{label}</span>;
  return <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"><Icon className="size-4" />{label}</a>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <Card className="mt-8 border-red-500/40"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-red-700"><span>{message} Check your connection, then try again.</span><Button variant="outline" size="sm" onClick={onRetry}>Retry</Button></CardContent></Card>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center"><BookOpen className="size-8 text-emerald-600" /><h2 className="mt-4 font-semibold text-stone-900">{title}</h2><p className="mt-2 max-w-sm text-sm text-stone-500">{description}</p></div>;
}
