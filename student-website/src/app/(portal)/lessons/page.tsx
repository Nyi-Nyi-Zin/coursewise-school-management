"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, ExternalLink, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPublishedLessons } from "@/lib/student-repository";
import { demoLessons, studentQueryKeys } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";

export default function LessonsPage() {
  const { data: lessons = [], isLoading } = useQuery({ queryKey: studentQueryKeys.lessons, queryFn: getPublishedLessons, initialData: demoLessons, enabled: isFirebaseConfigured });
  return <section><p className="text-sm font-medium text-sky-300">Learning library</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Lessons</h1><p className="mt-3 max-w-2xl leading-7 text-slate-400">Explore published lesson materials at your own pace, then return to complete your quizzes.</p><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{isLoading ? Array.from({ length: 3 }).map((_, index) => <Card key={index} className="h-64 animate-pulse bg-slate-900" />) : lessons.map((lesson) => <Card key={lesson.id} className="group overflow-hidden"><div className="h-1 bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500" /><CardContent className="p-6"><div className="flex items-center justify-between"><Badge>{lesson.module}</Badge><span className="text-xs text-slate-500">{lesson.duration}</span></div><h2 className="mt-6 text-lg font-semibold text-white">{lesson.title}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">{lesson.description}</p><div className="mt-6 flex gap-2"><button className="inline-flex items-center gap-2 text-sm font-semibold text-sky-300 hover:text-sky-200"><PlayCircle className="size-4" />Open lesson</button><button className="ml-auto text-slate-500 hover:text-slate-200" aria-label="Open resources"><ExternalLink className="size-4" /></button></div></CardContent></Card>)}</div>{!isLoading && lessons.length === 0 ? <EmptyState title="No lessons have been published yet." description="Your instructor will add learning material here." /> : null}</section>;
}

function EmptyState({ title, description }: { title: string; description: string }) { return <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center"><BookOpen className="size-8 text-sky-300" /><h2 className="mt-4 font-semibold text-white">{title}</h2><p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p></div>; }
