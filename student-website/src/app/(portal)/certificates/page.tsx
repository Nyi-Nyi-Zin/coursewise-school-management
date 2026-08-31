"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Award, BadgeCheck, BarChart3, CalendarDays, Check, CheckCircle2,
  Download, Eye, FileBadge2, Loader2, Medal, Share2, ShieldCheck, UserRound,
} from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { CertificateTemplate } from "@/components/certificate-template";
import { useStudentCourse } from "@/components/student-course-provider";
import { getMyCertificates, type StudentCertificate } from "@/lib/student-repository";

function formatDate(iso?: string, compact = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric", month: compact ? "short" : "long", year: "numeric",
  });
}

export default function CertificatesPage() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const [printCertificate, setPrintCertificate] = useState<StudentCertificate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const certificates = useQuery({
    queryKey: ["student", "certificates", user?.uid],
    queryFn: () => getMyCertificates(),
    enabled: Boolean(user?.uid),
  });

  const items = certificates.data ?? [];
  const selectedCertificate = items.find(item => item.id === selectedId) ?? items[0];

  function print(cert: StudentCertificate) {
    setPrintCertificate(cert);
    window.setTimeout(() => window.print(), 0);
  }

  async function share(cert: StudentCertificate) {
    const text = `${cert.courseTitle} certificate — verification code: ${cert.verificationCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "Course certificate", text });
      else await navigator.clipboard.writeText(text);
      setCopiedCode(cert.verificationCode);
      window.setTimeout(() => setCopiedCode(null), 1800);
    } catch {
      // Closing the native share sheet is an intentional no-op.
    }
  }

  return (
    <section className="mx-auto min-w-0 w-full max-w-[1240px] overflow-x-hidden">
      <header className="text-center">
        <p className="text-sm font-semibold text-teal-700">Achievement record{enrollment ? ` · ${enrollment.batchName}` : ""}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-4xl">Certificates</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Courses you successfully complete are recognised with an official certificate bearing a unique serial and verification code.
        </p>
      </header>

      {certificates.isLoading ? (
        <div className="mt-16 flex items-center justify-center gap-3 text-sm text-slate-400"><Loader2 className="size-4 animate-spin" /> Loading certificates…</div>
      ) : certificates.isError ? (
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">Certificates could not be loaded. Check your connection and try again.</div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : selectedCertificate ? (
        <>
          <div className="mt-7 grid gap-3 min-[430px]:grid-cols-2 sm:grid-cols-3">
            <MetricCard icon={Medal} label="Certificates earned" value={items.length} detail="Total certificates earned" />
            <MetricCard icon={BarChart3} label="Final exam score" value={`${selectedCertificate.percentage}%`} detail={`${selectedCertificate.score} of ${selectedCertificate.totalMarks} marks`} progress={selectedCertificate.percentage} />
            <MetricCard icon={ShieldCheck} label="Verification ready" value={items.length} detail="Certificates ready to verify" />
          </div>

          <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,.78fr)]">
            <div className="min-w-0 space-y-3">
              <FeaturedCertificate certificate={selectedCertificate} onPrint={() => print(selectedCertificate)} onShare={() => share(selectedCertificate)} copied={copiedCode === selectedCertificate.verificationCode} />
              <CertificateHistory items={items} selectedId={selectedCertificate.id} onSelect={setSelectedId} onPrint={print} onShare={share} copiedCode={copiedCode} />
            </div>
            <aside className="min-w-0 space-y-3">
              <VerificationPanel certificate={selectedCertificate} copied={copiedCode === selectedCertificate.verificationCode} onCopy={() => share(selectedCertificate)} />
              <ProgressPanel percentage={selectedCertificate.percentage} />
            </aside>
          </div>
        </>
      ) : null}

      {printCertificate ? <div id="print-certificate" className="hidden"><PrintCertificate certificate={printCertificate} /></div> : null}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body * { visibility: hidden !important; }
          #print-certificate, #print-certificate * { visibility: visible !important; }
          #print-certificate { position: fixed; inset: 0; z-index: 99999; display: grid !important; place-items: center; background: white; }
          #print-certificate .certificate-template { width: 297mm !important; height: 210mm !important; box-shadow: none !important; }
        }
      `}</style>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-14 flex max-w-lg flex-col items-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-[0_12px_35px_rgba(15,23,42,0.05)]">
      <div className="grid size-16 place-items-center rounded-full bg-teal-50 ring-8 ring-teal-50/50"><Award className="size-8 text-teal-600" /></div>
      <h2 className="mt-6 text-xl font-bold text-slate-900">Your first certificate is ahead</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Pass a final exam with at least 70% and your official course certificate will appear here automatically.</p>
      <Link href="/quizzes" className="mt-6 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800">View final exams</Link>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, progress }: { icon: typeof Award; label: string; value: string | number; detail: string; progress?: number }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-[0_7px_24px_rgba(15,23,42,0.045)] sm:min-h-24 sm:gap-4 sm:px-5 sm:py-4">
      {typeof progress === "number" ? (
        <div className="relative grid size-10 shrink-0 place-items-center rounded-full sm:size-14" style={{ background: `conic-gradient(#10a887 ${Math.min(100, Math.max(0, progress))}%, #dff5ef 0)` }}><div className="grid size-7 place-items-center rounded-full bg-white text-[9px] font-bold text-teal-700 sm:size-10 sm:text-[11px]">{progress}%</div></div>
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e9faf5] text-teal-600 sm:size-14"><Icon className="size-5 sm:size-7" strokeWidth={1.8} /></span>
      )}
      <div className="min-w-0"><p className="text-[10px] font-semibold text-slate-600 sm:text-xs">{label}</p><p className="mt-0.5 text-xl font-extrabold leading-none text-slate-950 sm:text-2xl">{value}</p><p className="mt-1 truncate text-[10px] text-slate-500 sm:mt-2 sm:text-xs">{detail}</p></div>
    </div>
  );
}

function FeaturedCertificate({ certificate, onPrint, onShare, copied }: { certificate: StudentCertificate; onPrint: () => void; onShare: () => void; copied: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(245px,.92fr)_minmax(0,1.42fr)]">
        <CertificatePreview certificate={certificate} />
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-col items-start gap-2 min-[390px]:flex-row min-[390px]:justify-between min-[390px]:gap-3"><h2 className="min-w-0 break-words text-lg font-bold leading-snug text-slate-950">{certificate.courseTitle} Certificate</h2><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> Earned</span></div>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
            <CertificateDetail icon={UserRound} label="Recipient" value={certificate.studentName} />
            <CertificateDetail icon={CalendarDays} label="Completed on" value={formatDate(certificate.issuedAt)} />
            <CertificateDetail icon={FileBadge2} label="Certificate ID" value={certificate.certificateId} />
            <CertificateDetail icon={BadgeCheck} label="Final score" value={`${certificate.percentage}% · Passed`} />
          </dl>
          <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-3">
            <button onClick={onPrint} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-800 to-teal-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"><Eye className="size-4" /> View certificate</button>
            <button onClick={onPrint} className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-3 py-2.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"><Download className="size-4" /> Download PDF</button>
            <button onClick={onShare} className="inline-flex items-center justify-center gap-2 rounded-xl border border-teal-600 bg-white px-3 py-2.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-50">{copied ? <Check className="size-4" /> : <Share2 className="size-4" />} {copied ? "Shared" : "Share"}</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function CertificatePreview({ certificate }: { certificate: StudentCertificate }) {
  return (
    <CertificateTemplate
      studentName={certificate.studentName}
      courseTitle={certificate.courseTitle}
      batchName={certificate.batchName}
      issuedDate={formatDate(certificate.issuedAt)}
      certificateId={certificate.certificateId}
      verificationCode={certificate.verificationCode}
    />
  );
}

function CertificateDetail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)] items-center gap-x-1.5 gap-y-0.5 min-[390px]:grid-cols-[18px_104px_minmax(0,1fr)]"><Icon className="size-4 text-slate-500" strokeWidth={1.8} /><dt className="text-slate-500">{label}</dt><dd className="col-start-2 min-w-0 break-words font-semibold text-slate-800 min-[390px]:col-start-3" title={value}>{value}</dd></div>;
}

function VerificationPanel({ certificate, onCopy, copied }: { certificate: StudentCertificate; onCopy: () => void; copied: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_24px_rgba(15,23,42,0.04)]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="size-5 text-teal-600" /> Verification details</h2>
      <dl className="mt-5 space-y-4 text-xs">
        <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto] min-[390px]:items-center"><dt className="text-slate-500">Verification code</dt><dd className="min-w-0"><button onClick={onCopy} title="Copy or share verification code" className="max-w-full break-all rounded-lg bg-teal-50 px-3 py-2 font-mono font-bold text-teal-700 transition hover:bg-teal-100">{copied ? "Copied!" : certificate.verificationCode}</button></dd></div>
        <div className="grid gap-1 min-[390px]:grid-cols-[1fr_auto] min-[390px]:items-center"><dt className="text-slate-500">Issued on</dt><dd className="font-semibold text-slate-700">{formatDate(certificate.issuedAt, true)}</dd></div>
        <div className="grid gap-2 min-[390px]:grid-cols-[1fr_auto] min-[390px]:items-center"><dt className="text-slate-500">Status</dt><dd className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> Verified</dd></div>
      </dl>
    </section>
  );
}

function ProgressPanel({ percentage }: { percentage: number }) {
  const bounded = Math.min(100, Math.max(0, percentage));
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_24px_rgba(15,23,42,0.04)]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BarChart3 className="size-5 text-teal-600" /> Certificate performance</h2>
      <p className="mt-4 text-xs text-slate-500">Your final assessment result for this certificate</p>
      <div className="mt-5 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-teal-700 to-emerald-500" style={{ width: `${bounded}%` }} /></div><span className="text-sm font-bold text-slate-800">{bounded}%</span></div>
      <div className="mt-4 flex flex-col gap-1.5 text-[11px] text-slate-500 min-[390px]:flex-row min-[390px]:justify-between"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Pass mark 70%</span><span>{Math.max(0, bounded - 70)}% above target</span></div>
      <div className="mt-5 border-t border-slate-100 pt-4"><Link href="/quizzes" className="text-xs font-semibold text-teal-700 transition hover:text-teal-900">View assessment results →</Link></div>
    </section>
  );
}

function CertificateHistory({ items, selectedId, onSelect, onPrint, onShare, copiedCode }: { items: StudentCertificate[]; selectedId: string; onSelect: (id: string) => void; onPrint: (cert: StudentCertificate) => void; onShare: (cert: StudentCertificate) => void; copiedCode: string | null }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_24px_rgba(15,23,42,0.04)]">
      <h2 className="px-5 pb-3 pt-4 text-sm font-bold text-slate-900">Certificate history</h2>
      <div className="space-y-2 px-3 pb-3 md:hidden">
        {items.map(cert => (
          <article key={cert.id} className={`rounded-xl border p-3 ${selectedId === cert.id ? "border-teal-200 bg-teal-50/45" : "border-slate-100"}`}>
            <button onClick={() => onSelect(cert.id)} className="grid w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-3 text-left min-[390px]:grid-cols-[40px_minmax(0,1fr)_auto]">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#0b2132] text-[#e8c66c]"><FileBadge2 className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-800">{cert.courseTitle} Certificate</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">ID: {cert.certificateId} · {formatDate(cert.issuedAt, true)}</span></span>
              <span className="col-start-2 w-fit rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 min-[390px]:col-start-3 min-[390px]:row-start-1">Verified</span>
            </button>
            <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-2"><ActionButton label="View certificate" onClick={() => onSelect(cert.id)}><Eye className="size-4" /></ActionButton><ActionButton label="Download PDF" onClick={() => onPrint(cert)}><Download className="size-4" /></ActionButton><ActionButton label="Share certificate" onClick={() => onShare(cert)}>{copiedCode === cert.verificationCode ? <Check className="size-4" /> : <Share2 className="size-4" />}</ActionButton></div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto px-4 pb-3 md:block">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500"><tr><th className="rounded-l-lg px-3 py-2">Certificate</th><th className="px-3 py-2">Issued date</th><th className="px-3 py-2">Status</th><th className="rounded-r-lg px-3 py-2 text-right">Action</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{items.map(cert => (
            <tr key={cert.id} className={selectedId === cert.id ? "bg-teal-50/35" : ""}>
              <td className="px-3 py-2.5"><button onClick={() => onSelect(cert.id)} className="flex max-w-sm items-center gap-3 text-left"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#0b2132] text-[#e8c66c]"><FileBadge2 className="size-5" /></span><span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{cert.courseTitle} Certificate</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">ID: {cert.certificateId}</span></span></button></td>
              <td className="px-3 py-2.5 text-slate-500">{formatDate(cert.issuedAt, true)}</td><td className="px-3 py-2.5"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Verified</span></td>
              <td className="px-3 py-2.5"><div className="flex justify-end gap-1"><ActionButton label="View certificate" onClick={() => onSelect(cert.id)}><Eye className="size-4" /></ActionButton><ActionButton label="Download PDF" onClick={() => onPrint(cert)}><Download className="size-4" /></ActionButton><ActionButton label="Share certificate" onClick={() => onShare(cert)}>{copiedCode === cert.verificationCode ? <Check className="size-4" /> : <Share2 className="size-4" />}</ActionButton></div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-500">Showing {items.length} of {items.length} certificate{items.length === 1 ? "" : "s"}</p>
    </section>
  );
}

function ActionButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} aria-label={label} title={label} className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-teal-50 hover:text-teal-700">{children}</button>;
}

function PrintCertificate({ certificate }: { certificate: StudentCertificate }) {
  return (
    <CertificateTemplate
      studentName={certificate.studentName}
      courseTitle={certificate.courseTitle}
      batchName={certificate.batchName}
      issuedDate={formatDate(certificate.issuedAt)}
      certificateId={certificate.certificateId}
      verificationCode={certificate.verificationCode}
    />
  );
}
