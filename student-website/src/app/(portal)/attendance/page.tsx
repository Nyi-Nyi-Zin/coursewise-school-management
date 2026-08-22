"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck2, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStudentAttendance } from "@/lib/student-repository";
import { demoAttendance, studentQueryKeys } from "@/lib/student-data";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";

const statusClasses = { Present: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20", Absent: "bg-rose-400/10 text-rose-300 ring-rose-400/20", Late: "bg-amber-400/10 text-amber-300 ring-amber-400/20", Excused: "bg-sky-400/10 text-sky-300 ring-sky-400/20" };

export default function AttendancePage() {
  const { user } = useStudentAuth(); const { enrollment } = useStudentCourse();
  const { data: records = [], isLoading } = useQuery({ queryKey: [...studentQueryKeys.attendance, user?.uid, enrollment?.courseId, enrollment?.batchId], queryFn: () => getStudentAttendance(user!.uid, enrollment?.courseId, enrollment?.batchId), initialData: isFirebaseConfigured ? undefined : demoAttendance, enabled: !isFirebaseConfigured || Boolean(user?.uid && enrollment) });
  const present = records.filter((record) => record.status === "Present").length;
  return <section><p className="text-sm font-medium text-sky-300">Your private record{enrollment ? ` · ${enrollment.batchName}` : ""}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Attendance</h1><div className="mt-8 grid gap-4 sm:grid-cols-3"><Stat label="Attendance rate" value={records.length ? `${Math.round((present / records.length) * 100)}%` : "—"} icon={CalendarCheck2} /><Stat label="Present sessions" value={String(present)} icon={CalendarCheck2} /><Stat label="Total records" value={String(records.length)} icon={Clock3} /></div><Card className="mt-6"><CardContent className="p-0"><div className="border-b border-slate-800 px-6 py-5"><h2 className="font-semibold text-white">Recent sessions</h2></div>{isFirebaseConfigured && !enrollment && !isLoading ? <div className="p-6 text-sm text-amber-200">Your account is not enrolled in an active batch yet. Ask an administrator to assign your Firebase UID.</div> : isLoading ? <div className="p-6 text-sm text-slate-400">Loading attendance…</div> : records.map((record, index) => <div key={`${record.date}-${index}`} className="flex items-center gap-4 border-b border-slate-800 px-6 py-4 last:border-none"><div className="grid size-10 place-items-center rounded-xl bg-slate-800 text-sky-300"><CalendarCheck2 className="size-5" /></div><div className="min-w-0"><p className="font-medium text-slate-200">{record.date}</p><p className="truncate text-sm text-slate-500">{record.note}</p></div><Badge className={`ml-auto ${statusClasses[record.status as keyof typeof statusClasses]}`}>{record.status}</Badge></div>)}</CardContent></Card></section>;
}
function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CalendarCheck2 }) { return <Card><CardContent className="flex items-center gap-4 p-5"><div className="grid size-10 place-items-center rounded-xl bg-sky-400/10 text-sky-300"><Icon className="size-5" /></div><div><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></div></CardContent></Card>; }
