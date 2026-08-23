"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, FileText, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demoAnnouncements, demoLessons, studentQueryKeys, type Announcement } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { getPublishedAnnouncements, getStudentProfile } from "@/lib/student-repository";

const quickLinks = [
  { href: "/lessons", label: "Lessons", description: "Continue learning", icon: BookOpen, tint: "bg-sky-400/10 text-sky-300" },
  { href: "/quizzes", label: "Quizzes", description: "Test your progress", icon: ClipboardCheck, tint: "bg-violet-400/10 text-violet-300" },
  { href: "/assignments", label: "Assignments", description: "Plan your work", icon: FileText, tint: "bg-amber-400/10 text-amber-300" },
  { href: "/attendance", label: "Attendance", description: "View your record", icon: CalendarDays, tint: "bg-emerald-400/10 text-emerald-300" },
];

export default function StudentHomePage() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const [bannerIndex, setBannerIndex] = useState(0);
  const profile = useQuery({ queryKey: ["student", "profile", user?.uid], queryFn: () => getStudentProfile(user!.uid), enabled: Boolean(user?.uid) });
  const name = profile.data?.name || user?.displayName || "Student"; const studentId = profile.data?.studentId;
  const announcements = useQuery({ queryKey: [...studentQueryKeys.announcements, enrollment?.courseId, enrollment?.batchId], queryFn: () => getPublishedAnnouncements(enrollment?.courseId, enrollment?.batchId), initialData: isFirebaseConfigured ? undefined : demoAnnouncements, enabled: !isFirebaseConfigured || Boolean(enrollment) });
  const { data: lessons = demoLessons } = useQuery({ queryKey: studentQueryKeys.lessons, queryFn: async () => demoLessons, initialData: demoLessons, enabled: isFirebaseConfigured });
  const banners: Announcement[] = announcements.data?.length ? announcements.data : demoAnnouncements;
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setBannerIndex((index) => (index + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);
  const announcement = banners[Math.min(bannerIndex, banners.length - 1)];
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 px-6 py-8 sm:px-9 sm:py-10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.18),transparent_28rem)]" /><div className="relative max-w-2xl"><Badge className="mb-4"><Sparkles className="mr-1 size-3" />Today&apos;s learning space</Badge><div className="flex items-center gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-xl font-bold text-slate-950">{profile.data?.photoUrl ? <img src={profile.data.photoUrl} alt={name} className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-medium text-sky-300">Good morning, {name}</p><p className="mt-0.5 text-xs font-medium tracking-wide text-slate-500">Student ID · {studentId || "Pending"}</p></div></div><h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">Build your skills with intention.</h1><p className="mt-3 max-w-xl leading-7 text-slate-400">Your course content, practice, attendance, and upcoming milestones are all in one focused place.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/lessons"><Button>Continue learning <ArrowRight className="size-4" /></Button></Link><Link href="/profile"><Button variant="outline">View profile</Button></Link></div></div></section>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium text-sky-300">Quick access</p><h2 className="mt-1 text-xl font-bold text-white">Your learning tools</h2></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickLinks.map(({ href, label, description, icon: Icon, tint }) => <Link key={href} href={href} className="group"><Card className="h-full transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-700"><CardContent className="flex items-center gap-4 p-4"><div className={`grid size-11 place-items-center rounded-xl ${tint}`}><Icon className="size-5" /></div><div className="min-w-0"><h3 className="font-semibold text-slate-100">{label}</h3><p className="truncate text-sm text-slate-400">{description}</p></div><ArrowRight className="ml-auto size-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-300" /></CardContent></Card></Link>)}</div></section>
    <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]"><Card className="overflow-hidden"><CardContent className={`relative min-h-56 overflow-hidden bg-gradient-to-br ${announcement.accent} p-6 sm:p-8`}>{announcement.bannerUrl ? <img src={announcement.bannerUrl} alt="" className="absolute inset-0 size-full object-cover opacity-40" /> : null}<div className="relative max-w-md"><p className="flex items-center gap-2 text-sm font-medium text-sky-200"><Megaphone className="size-4" />{announcement.publishedAt}</p><h2 className="mt-2 text-2xl font-bold text-white">{announcement.title}</h2><p className="mt-3 leading-7 text-slate-300">{announcement.description}</p>{announcement.linkUrl ? <a href={announcement.linkUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 hover:text-sky-100">Open announcement link <ArrowRight className="size-4" /></a> : <Link href="/lessons" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-200 hover:text-sky-100">Explore lessons <ArrowRight className="size-4" /></Link>}</div><div className="absolute bottom-4 right-5 flex gap-1.5">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`Show announcement ${index + 1}`} onClick={() => setBannerIndex(index)} className={`h-1.5 rounded-full transition-all ${index === bannerIndex ? "w-5 bg-sky-300" : "w-1.5 bg-slate-500 hover:bg-slate-400"}`} />)}</div></CardContent></Card><Card><CardContent className="p-6"><p className="text-sm font-medium text-sky-300">This week</p><h2 className="mt-1 text-xl font-bold text-white">Learning progress</h2><div className="mt-6 grid place-items-center"><div className="grid size-32 place-items-center rounded-full border-[10px] border-sky-400/20 border-t-sky-400"><div className="text-center"><p className="text-2xl font-bold text-white">68%</p><p className="text-xs text-slate-400">complete</p></div></div></div><p className="mt-5 text-center text-sm leading-6 text-slate-400">You are on track. Complete one lesson to reach this week&apos;s goal.</p></CardContent></Card></section>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium text-sky-300">Resume</p><h2 className="mt-1 text-xl font-bold text-white">Continue where you left off</h2></div><Link href="/lessons" className="text-sm font-semibold text-sky-300 hover:text-sky-200">All lessons</Link></div><div className="grid gap-3 md:grid-cols-3">{lessons.map((lesson) => <Card key={lesson.id}><CardContent className="p-5"><div className="flex items-center justify-between"><Badge className="bg-slate-800 text-slate-300 ring-slate-700">{lesson.module}</Badge>{lesson.status === "complete" ? <CheckCircle2 className="size-5 text-emerald-400" /> : null}</div><h3 className="mt-5 font-semibold text-white">{lesson.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{lesson.description}</p><div className="mt-5 flex items-center justify-between text-xs text-slate-500"><span>{lesson.duration}</span><Link href="/lessons" className="font-semibold text-sky-300">{lesson.status === "continue" ? "Continue" : lesson.status === "complete" ? "Review" : "Start"}</Link></div></CardContent></Card>)}</div></section>
  </div>;
}
