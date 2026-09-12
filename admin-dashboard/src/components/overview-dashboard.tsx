"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  ClipboardCheck,
  FileText,
  Layers3,
  LibraryBig,
  Users,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { hasFirebaseConfiguration } from "@/lib/firebase";
import { loadAllBatches, loadCourses } from "@/lib/course-batch-service";
import { loadOverviewQuizSummaries } from "@/lib/overview-activity";
import type { OfflineRecords } from "@/lib/offline-records";
import {
  buildOverviewDashboardData,
  formatOverviewDate,
  type OverviewDashboardData,
  type OverviewNavigationSection,
} from "@/lib/overview-dashboard";

type OverviewDashboardProps = {
  records: OfflineRecords;
  recordsLoading?: boolean;
  recordsError?: string | null;
  onNavigate: (section: OverviewNavigationSection) => void;
};

export function OverviewDashboard({ records, recordsLoading = false, recordsError = null }: OverviewDashboardProps) {
  const structureQuery = useQuery({
    queryKey: ["admin", "overview", "school-structure"],
    queryFn: async () => {
      const [courses, batches] = await Promise.all([loadCourses(), loadAllBatches()]);
      return { courses, batches };
    },
    enabled: hasFirebaseConfiguration,
  });
  const performanceQuery = useQuery({
    queryKey: ["admin", "overview", "quiz-summaries"],
    queryFn: loadOverviewQuizSummaries,
    enabled: hasFirebaseConfiguration,
  });

  const data = useMemo(
    () => buildOverviewDashboardData(records, structureQuery.data?.courses, structureQuery.data?.batches, new Date(), performanceQuery.data),
    [performanceQuery.data, records, structureQuery.data?.batches, structureQuery.data?.courses],
  );
  const recordsUnavailable = !hasFirebaseConfiguration || Boolean(recordsError) || recordsLoading;
  const structureUnavailable = !hasFirebaseConfiguration || Boolean(structureQuery.error) || structureQuery.isPending;
  const performanceUnavailable = !hasFirebaseConfiguration || Boolean(performanceQuery.error) || performanceQuery.isPending;

  return (
    <div className="space-y-5">
      {!hasFirebaseConfiguration ? (
        <Alert>
          <AlertTitle>Connect Firebase to view live overview metrics.</AlertTitle>
          <AlertDescription>Configure the admin Firebase environment variables to load students, courses, batches, and learning content.</AlertDescription>
        </Alert>
      ) : null}
      {recordsError ? (
        <Alert variant="destructive">
          <AlertTitle>Learning records are unavailable.</AlertTitle>
          <AlertDescription>{recordsError}</AlertDescription>
        </Alert>
      ) : null}
      {structureQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Course and batch totals are unavailable.</AlertTitle>
          <AlertDescription>Other overview widgets remain available. Open Courses &amp; batches to retry the school structure query.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total students"
          value={recordsUnavailable ? "—" : data.students.total}
          detail={recordsUnavailable ? "Unavailable" : `${data.students.active} active`}
          icon={Users}
          tone="blue"
          loading={recordsLoading}
        />
        <MetricCard
          label="Active courses"
          value={structureUnavailable ? "—" : data.courses.active}
          detail={structureUnavailable ? "Unavailable" : `${data.courses.total} total courses`}
          icon={BookMarked}
          tone="green"
          loading={hasFirebaseConfiguration && structureQuery.isPending}
        />
        <MetricCard
          label="Active batches"
          value={structureUnavailable ? "—" : data.batches.active}
          detail={structureUnavailable ? "Unavailable" : `${data.batches.total} total batches`}
          icon={Layers3}
          tone="amber"
          loading={hasFirebaseConfiguration && structureQuery.isPending}
        />
        <MetricCard
          label="Published content"
          value={recordsUnavailable ? "—" : data.publishedContent}
          detail={recordsUnavailable ? "Unavailable" : `${data.draftContent} drafts to review.`}
          icon={LibraryBig}
          tone="purple"
          loading={recordsLoading}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <StudentGrowthCard data={data} unavailable={recordsUnavailable} />
        <TopPerformersCard data={data} unavailable={recordsUnavailable || performanceUnavailable} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, icon: Icon, tone, loading }: { label: string; value: number | string; detail: string; icon: typeof Users; tone: "blue" | "green" | "amber" | "purple"; loading?: boolean }) {
  const toneClasses = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-violet-50 text-violet-700",
  } as const;

  return (
    <Card className="h-full rounded-2xl py-3">
      <CardContent className="flex items-center gap-5 p-6">
        <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${toneClasses[tone]}`}><Icon size={19} /></span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-stone-500">{label}</p>
          {loading ? <Skeleton className="mt-1 h-8 w-16" /> : <p className="mt-0.5 font-display text-3xl font-semibold tracking-tight">{value}</p>}
          <p className="mt-1 truncate text-xs text-stone-400">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentGrowthCard({ data, unavailable }: { data: OverviewDashboardData; unavailable: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="p-6 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">People</p>
        <CardTitle>Student growth</CardTitle>
        <CardDescription>New student registrations over the last six months.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        {unavailable ? <UnavailableState /> : data.studentGrowth.every(item => item.count === 0) ? <EmptyState message="No dated student activity yet." /> : (
          <ChartContainer className="h-[270px]" config={{ count: { label: "New students", color: "#143d36" } }}>
            <BarChart accessibilityLayer data={data.studentGrowth} margin={{ left: 0, right: 12, top: 12, bottom: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} barSize={34} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function TopPerformersCard({ data, unavailable }: { data: OverviewDashboardData; unavailable: boolean }) {
  return (
    <Card className="h-full">
      <CardHeader className="p-6 pb-3">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-800/55">Student activity</p>
        <CardTitle>Top performers</CardTitle>
        <CardDescription>Students ranked by their weighted quiz score.</CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        {unavailable ? <UnavailableState /> : data.topPerformers.length === 0 ? <EmptyState message="No quiz scores yet." /> : (
          <ChartContainer className="h-[270px]" config={{ score: { label: "Quiz score", color: "#7c3aed" } }}>
            <BarChart accessibilityLayer data={data.topPerformers} layout="vertical" margin={{ left: 8, right: 12, top: 12, bottom: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={92} tick={{ fontSize: 11 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="score" fill="var(--color-score)" radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function NeedsAttentionCard({ data, unavailable, onNavigate }: { data: OverviewDashboardData; unavailable: boolean; onNavigate: (section: OverviewNavigationSection) => void }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-amber-700/70">Review queue</p>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>Small checks that keep the learning space ready for students.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unavailable ? <UnavailableState /> : (
          <>
            <AttentionRow
              title={`${data.draftContent} draft content item${data.draftContent === 1 ? "" : "s"}`}
              detail={data.draftContent ? data.content.filter(item => item.draft > 0).map(item => `${item.label}: ${item.draft}`).join(" · ") : "Everything is published."}
              tone={data.draftContent ? "warning" : "success"}
              action={data.draftContent ? "Review content" : undefined}
              onAction={data.draftContent ? () => onNavigate(data.content.find(item => item.draft > 0)?.key ?? "lessons") : undefined}
            />
            <AttentionRow
              title={`${data.emptyModules.length} empty module${data.emptyModules.length === 1 ? "" : "s"}`}
              detail={data.emptyModules.length ? data.emptyModules.map(item => item.label).join(" · ") : "Every learning module has a record."}
              tone={data.emptyModules.length ? "warning" : "success"}
              action={data.emptyModules.length ? "Open module" : undefined}
              onAction={data.emptyModules.length ? () => onNavigate(data.emptyModules[0].key) : undefined}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function UpcomingWorkCard({ data, unavailable, onNavigate }: { data: OverviewDashboardData; unavailable: boolean; onNavigate: (section: OverviewNavigationSection) => void }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Schedule</p>
        <CardTitle>Upcoming work</CardTitle>
        <CardDescription>Published assignments and quizzes with a future date.</CardDescription>
      </CardHeader>
      <CardContent>
        {unavailable ? <UnavailableState /> : data.upcomingWork.length === 0 ? <EmptyState message="No upcoming assignments or quizzes." /> : (
          <div className="divide-y divide-stone-100">
            {data.upcomingWork.map(item => (
              <button key={`${item.section}-${item.id}`} type="button" onClick={() => onNavigate(item.section)} className="group flex w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                  {item.section === "assignments" ? <FileText size={16} /> : <ClipboardCheck size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-stone-800">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-stone-400">{item.label} · {formatOverviewDate(item.date)}</span>
                </span>
                <ArrowRight size={15} className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-700" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function QuickAccessCard({ onNavigate }: { onNavigate: (section: OverviewNavigationSection) => void }) {
  const actions: Array<{ section: OverviewNavigationSection; icon: typeof Users; label: string; detail: string }> = [
    { section: "students", icon: Users, label: "Students", detail: "Manage profiles" },
    { section: "courses", icon: BookMarked, label: "Courses & batches", detail: "Organize learning" },
    { section: "announcements", icon: Bell, label: "Announcements", detail: "Publish updates" },
    { section: "lessons", icon: BookOpen, label: "Lessons", detail: "Build the library" },
    { section: "assignments", icon: FileText, label: "Assignments", detail: "Set course work" },
    { section: "quizzes", icon: ClipboardCheck, label: "Quizzes", detail: "Review assessments" },
  ];

  return (
    <Card>
      <CardHeader>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-800/55">Quick access</p>
        <CardTitle>Open a workspace</CardTitle>
        <CardDescription>Jump directly to the area you want to manage.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map(({ section, icon: Icon, label, detail }) => (
          <Button key={section} type="button" variant="outline" className="h-auto justify-start rounded-2xl p-3 text-left" onClick={() => onNavigate(section)}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon size={16} /></span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-bold">{label}</span>
              <span className="mt-0.5 block truncate text-[11px] font-normal text-stone-400">{detail}</span>
            </span>
            <ArrowRight size={14} className="ml-auto shrink-0 text-stone-300" />
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function AttentionRow({ title, detail, tone, action, onAction }: { title: string; detail: string; tone: "warning" | "success"; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-3">
      <span className={`mt-0.5 size-2 shrink-0 rounded-full ${tone === "warning" ? "bg-amber-500" : "bg-emerald-600"}`} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-bold text-stone-800">
          {title}
          <Badge variant={tone === "warning" ? "warning" : "default"}>{tone === "warning" ? "Review" : "Ready"}</Badge>
        </p>
        <p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
      {action && onAction ? <Button type="button" variant="ghost" size="sm" className="shrink-0 text-emerald-800" onClick={onAction}>{action}</Button> : null}
    </div>
  );
}

function UnavailableState() {
  return <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-400">Data unavailable</div>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-5 text-center text-sm text-stone-400">{message}</div>;
}
