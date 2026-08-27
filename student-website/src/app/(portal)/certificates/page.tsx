"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Award, BadgeCheck, BarChart3, CalendarDays, Check, CheckCircle2,
  Download, Eye, FileBadge2, Loader2, Medal, Share2, ShieldCheck, UserRound,
} from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
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
    <section className="mx-auto w-full max-w-[1240px]">
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
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <MetricCard icon={Medal} label="Certificates earned" value={items.length} detail="Total certificates earned" />
            <MetricCard icon={BarChart3} label="Final exam score" value={`${selectedCertificate.percentage}%`} detail={`${selectedCertificate.score} of ${selectedCertificate.totalMarks} marks`} progress={selectedCertificate.percentage} />
            <MetricCard icon={ShieldCheck} label="Verification ready" value={items.length} detail="Certificates ready to verify" />
          </div>

          <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(290px,.78fr)]">
            <div className="space-y-3">
              <FeaturedCertificate certificate={selectedCertificate} onPrint={() => print(selectedCertificate)} onShare={() => share(selectedCertificate)} copied={copiedCode === selectedCertificate.verificationCode} />
              <CertificateHistory items={items} selectedId={selectedCertificate.id} onSelect={setSelectedId} onPrint={print} onShare={share} copiedCode={copiedCode} />
            </div>
            <aside className="space-y-3">
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
          #print-certificate .cert-border { border: 3px solid #0f766e !important; padding: 3rem !important; }
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
    <div className="flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_7px_24px_rgba(15,23,42,0.045)]">
      {typeof progress === "number" ? (
        <div className="relative grid size-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#10a887 ${Math.min(100, Math.max(0, progress))}%, #dff5ef 0)` }}><div className="grid size-10 place-items-center rounded-full bg-white text-[11px] font-bold text-teal-700">{progress}%</div></div>
      ) : (
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#e9faf5] text-teal-600"><Icon className="size-7" strokeWidth={1.8} /></span>
      )}
      <div className="min-w-0"><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-0.5 text-2xl font-extrabold leading-none text-slate-950">{value}</p><p className="mt-2 truncate text-xs text-slate-500">{detail}</p></div>
    </div>
  );
}

function FeaturedCertificate({ certificate, onPrint, onShare, copied }: { certificate: StudentCertificate; onPrint: () => void; onShare: () => void; copied: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(245px,.92fr)_minmax(0,1.42fr)]">
        <CertificatePreview certificate={certificate} />
        <div className="flex min-w-0 flex-col">
          <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-bold leading-snug text-slate-950">{certificate.courseTitle} Certificate</h2><span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> Earned</span></div>
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
    <div className="relative grid min-h-52 place-items-center overflow-hidden rounded-xl border-[3px] border-[#b48a2c] bg-[#071a2c] p-4 text-center shadow-inner ring-2 ring-[#071a2c] ring-offset-2">
      <div className="absolute inset-2 border border-[#d4a63d]/65" /><div className="absolute -left-9 -top-9 size-24 rotate-45 border border-[#d4a63d]/50" /><div className="absolute -bottom-9 -right-9 size-24 rotate-45 border border-[#d4a63d]/50" />
      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-2"><Image src="/teza-tech-lab-logo.svg" width={26} height={26} alt="" className="size-6 rounded-md" /><span className="text-[9px] font-semibold uppercase tracking-wider text-white">Teza Tech Lab</span></div>
        <p className="mt-5 font-serif text-lg tracking-[0.12em] text-[#e8c66c]">CERTIFICATE</p><p className="text-[7px] uppercase tracking-[0.24em] text-slate-300">of completion</p>
        <p className="mt-4 text-[8px] text-slate-400">This is to certify that</p><p className="mt-1 font-serif text-base font-semibold text-[#e8c66c]">{certificate.studentName}</p>
        <p className="mt-2 max-w-48 text-[8px] leading-4 text-slate-300">has successfully completed<br /><strong className="text-[#e8c66c]">{certificate.courseTitle}</strong></p><Medal className="mt-3 size-7 text-[#d9ad48]" />
      </div>
    </div>
  );
}

function CertificateDetail({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return <div className="grid min-w-0 grid-cols-[18px_104px_1fr] items-center gap-1.5"><Icon className="size-4 text-slate-500" strokeWidth={1.8} /><dt className="text-slate-500">{label}</dt><dd className="truncate font-semibold text-slate-800" title={value}>{value}</dd></div>;
}

function VerificationPanel({ certificate, onCopy, copied }: { certificate: StudentCertificate; onCopy: () => void; copied: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_7px_24px_rgba(15,23,42,0.04)]">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><ShieldCheck className="size-5 text-teal-600" /> Verification details</h2>
      <dl className="mt-5 space-y-4 text-xs">
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Verification code</dt><dd><button onClick={onCopy} title="Copy or share verification code" className="rounded-lg bg-teal-50 px-3 py-2 font-mono font-bold text-teal-700 transition hover:bg-teal-100">{copied ? "Copied!" : certificate.verificationCode}</button></dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Issued on</dt><dd className="font-semibold text-slate-700">{formatDate(certificate.issuedAt, true)}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Status</dt><dd className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700"><CheckCircle2 className="size-3.5" /> Verified</dd></div>
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
      <div className="mt-4 flex justify-between text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Pass mark 70%</span><span>{Math.max(0, bounded - 70)}% above target</span></div>
      <div className="mt-5 border-t border-slate-100 pt-4"><Link href="/quizzes" className="text-xs font-semibold text-teal-700 transition hover:text-teal-900">View assessment results →</Link></div>
    </section>
  );
}

function CertificateHistory({ items, selectedId, onSelect, onPrint, onShare, copiedCode }: { items: StudentCertificate[]; selectedId: string; onSelect: (id: string) => void; onPrint: (cert: StudentCertificate) => void; onShare: (cert: StudentCertificate) => void; copiedCode: string | null }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_7px_24px_rgba(15,23,42,0.04)]">
      <h2 className="px-5 pb-3 pt-4 text-sm font-bold text-slate-900">Certificate history</h2>
      <div className="overflow-x-auto px-4 pb-3">
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
  const modern = certificate.templateKey === "modern";
  return (
    <div className={`cert-border relative flex w-[297mm] max-w-full flex-col items-center overflow-hidden border p-12 text-center ${modern ? "border-teal-600 bg-white" : "border-[#143d36]/40 bg-[#fffdf7]"}`} style={{ aspectRatio: "297/210" }}>
      <div className={`absolute -left-20 -top-28 size-80 rounded-full border-[28px] ${modern ? "border-teal-100" : "border-[#d4f59b]/45"}`} /><div className="absolute -bottom-40 -right-20 size-96 rounded-full border-[30px] border-[#143d36]/10" /><div className="absolute inset-3 border border-[#c4a45b]/35" />
      <div className="flex items-center gap-3"><Image src="/teza-tech-lab-logo.svg" width={40} height={40} alt="" className="size-10" /><span className="text-lg font-bold text-slate-800">Teza Tech Lab</span></div>
      <div className={`mt-10 text-xs font-bold uppercase tracking-[0.25em] ${modern ? "text-teal-600" : "text-[#b08b37]"}`}>Certificate of Completion</div>
      <h1 className="mt-6 text-3xl font-bold text-slate-900">{certificate.studentName}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">has successfully completed the course <strong className="text-slate-800">{certificate.courseTitle}</strong> ({certificate.batchName}){certificate.totalMarks > 0 ? <> by passing the final assessment with a score of <strong className="text-teal-700">{certificate.percentage}%</strong></> : null}.</p>
      <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-6 text-left text-sm"><PrintDetail label="Serial No." value={certificate.certificateId} /><PrintDetail label="Issued" value={formatDate(certificate.issuedAt)} /><PrintDetail label="Student ID" value={certificate.studentCode} /><PrintDetail label="Verification Code" value={certificate.verificationCode} mono /></div>
      <div className="mt-auto pt-8 text-xs text-slate-400">This certificate was issued by Teza Tech Lab. Verify at the administrator portal.</div>
    </div>
  );
}

function PrintDetail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return <div><p className="text-xs text-slate-400">{label}</p><p className={`mt-0.5 font-bold text-slate-800 ${mono ? "font-mono tracking-wider" : ""}`}>{value}</p></div>;
}
