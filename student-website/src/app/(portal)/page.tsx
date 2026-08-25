"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Megaphone, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { demoAnnouncements, studentQueryKeys, type Announcement } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { getPublishedAnnouncements, getStudentProfile } from "@/lib/student-repository";

export default function StudentHomePage() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const [bannerIndex, setBannerIndex] = useState(0);
  const profile = useQuery({ queryKey: ["student", "profile", user?.uid], queryFn: () => getStudentProfile(user!.uid), enabled: Boolean(user?.uid) });
  const name = profile.data?.name || user?.displayName || "Student"; const studentId = profile.data?.studentId;
  const announcements = useQuery({ queryKey: [...studentQueryKeys.announcements, enrollment?.courseId, enrollment?.batchId], queryFn: () => getPublishedAnnouncements(enrollment?.courseId, enrollment?.batchId), initialData: isFirebaseConfigured ? undefined : demoAnnouncements, enabled: !isFirebaseConfigured || Boolean(enrollment) });
  const banners: Announcement[] = announcements.data?.length ? announcements.data : demoAnnouncements;
  useEffect(() => {
    if (banners.length < 2) return;
    const timer = setInterval(() => setBannerIndex((index) => (index + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);
  const announcement = banners[Math.min(bannerIndex, banners.length - 1)];
  return <div className="space-y-8">
    <section className="relative overflow-hidden rounded-3xl border border-stone-200 bg-gradient-to-br from-emerald-50 via-white to-stone-50 px-6 py-8 sm:px-9 sm:py-10"><div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(56,189,248,0.18),transparent_28rem)]" /><div className="relative max-w-2xl"><Badge className="mb-4"><Sparkles className="mr-1 size-3" />Today&apos;s learning space</Badge><div className="flex items-center gap-4"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-xl font-bold text-white">{profile.data?.photoUrl ? <img src={profile.data.photoUrl} alt={name} className="size-full object-cover" /> : name.slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-medium text-emerald-700">Good morning, {name}</p><p className="mt-0.5 text-xs font-medium tracking-wide text-stone-500">Student ID · {studentId || "Pending"}</p></div></div><h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">Build your skills with intention.</h1><p className="mt-3 max-w-xl leading-7 text-stone-500">Your course content, practice, and upcoming milestones are all in one focused place.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/lessons"><Button>Continue learning <ArrowRight className="size-4" /></Button></Link><Link href="/profile"><Button variant="outline">View profile</Button></Link></div></div></section>
    <section><div className="mb-4 flex items-end justify-between"><div><p className="text-sm font-medium text-emerald-700">Stay updated</p><h2 className="mt-1 text-xl font-bold text-stone-900">Announcements</h2></div></div>{banners.length ? <Card className="overflow-hidden"><CardContent className={`relative min-h-56 overflow-hidden bg-gradient-to-br ${announcement.accent} p-6 sm:p-8`}>{announcement.bannerUrl ? <img src={announcement.bannerUrl} alt="" className="absolute inset-0 size-full object-cover opacity-40" /> : null}<div className="relative max-w-md"><p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><Megaphone className="size-4" />{announcement.publishedAt}</p><h3 className="mt-2 text-2xl font-bold text-stone-900">{announcement.title}</h3><p className="mt-3 leading-7 text-stone-600">{announcement.description}</p>{announcement.linkUrl ? <a href={announcement.linkUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800">Open announcement link <ArrowRight className="size-4" /></a> : null}</div>{banners.length > 1 ? <div className="absolute bottom-4 right-5 flex gap-1.5">{banners.map((banner, index) => <button key={banner.id} type="button" aria-label={`Show announcement ${index + 1}`} onClick={() => setBannerIndex(index)} className={`h-1.5 rounded-full transition-all ${index === bannerIndex ? "w-5 bg-emerald-600" : "w-1.5 bg-stone-300 hover:bg-stone-400"}`} />)}</div> : null}</CardContent></Card> : <Card><CardContent className="p-6 text-stone-500">No announcements have been published for your batch yet.</CardContent></Card>}</section>
  </div>;
}
