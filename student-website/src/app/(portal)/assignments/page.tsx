import { ClipboardList, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function AssignmentsPage() {
  return <section><p className="text-sm font-medium text-sky-300">Plan your work</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Assignments</h1><p className="mt-3 text-slate-400">Track assignment briefs, reference files, due dates, and submission feedback.</p><Card className="mt-8 max-w-2xl"><CardContent className="p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><ClipboardList className="size-7" /></div><Badge className="mt-5 bg-slate-800 text-slate-300 ring-slate-700">No assignments yet</Badge><h2 className="mt-4 text-xl font-semibold text-white">Your next assignment will appear here.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">When your instructor publishes an assignment, you will be able to open its brief, download supporting resources, and track its due date.</p><div className="mt-6 inline-flex items-center gap-2 text-sm text-slate-500"><FileText className="size-4" />Assignment data is Firebase-ready.</div></CardContent></Card></section>;
}
