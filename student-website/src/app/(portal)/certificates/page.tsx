"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Award, BadgeCheck, Download, GraduationCap, Loader2 } from "lucide-react";
import { useStudentAuth } from "@/components/student-auth-provider";
import { useStudentCourse } from "@/components/student-course-provider";
import { getMyCertificates, type StudentCertificate } from "@/lib/student-repository";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

export default function CertificatesPage() {
  const { user } = useStudentAuth();
  const { enrollment } = useStudentCourse();
  const [printCertificate, setPrintCertificate] = useState<StudentCertificate | null>(null);
  const certificates = useQuery({
    queryKey: ["student", "certificates", user?.uid],
    queryFn: () => getMyCertificates(),
    enabled: Boolean(user?.uid),
  });

  const items = certificates.data ?? [];

  return (
    <section className="text-center">
      <p className="text-sm font-medium text-teal-700">Achievement record{enrollment ? ` · ${enrollment.batchName}` : ""}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Certificates</h1>
      <p className="mt-3 mx-auto max-w-2xl text-slate-500">
        Courses you successfully complete are recognised with an official certificate bearing a unique serial and verification code.
      </p>

      {certificates.isLoading ? (
        <div className="mt-12 flex items-center justify-center gap-3 text-sm text-slate-400">
          <Loader2 className="size-4 animate-spin" />Loading certificates…
        </div>
      ) : certificates.isError ? (
        <div className="mt-12 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
          Certificates could not be loaded. Check your connection and try again.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-slate-100">
            <Award className="size-8 text-slate-400" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-800">No certificates yet</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-500">
            Pass a final exam with at least 70% to automatically earn your course certificate.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {items.map((cert) => (
            <CertificateCard key={cert.id} certificate={cert} onPrint={() => { setPrintCertificate(cert); window.setTimeout(() => window.print(), 0); }} />
          ))}
        </div>
      )}

      {printCertificate ? <div id="print-certificate" className="hidden"><PrintCertificate certificate={printCertificate} /></div> : null}

      {/* Print-only certificate (last one selected) */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-certificate, #print-certificate * { visibility: visible !important; }
          #print-certificate { position: fixed; inset: 0; z-index: 99999; display: grid; place-items: center; background: white; }
          #print-certificate .cert-border { border: 3px solid #0F766E !important; padding: 3rem !important; }
        }
      `}</style>
    </section>
  );
}

function CertificateCard({ certificate, onPrint }: { certificate: StudentCertificate; onPrint: () => void }) {
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Teal top accent */}
        <div className="h-1.5 bg-gradient-to-r from-teal-500 to-teal-700" />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:p-8">
          {/* Icon */}
          <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-teal-50 ring-1 ring-teal-200">
            <GraduationCap className="size-8 text-teal-700" />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <BadgeCheck className="size-4 text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wide text-teal-700">Course Certificate</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-slate-900">{certificate.courseTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{certificate.batchName}</p>

            <div className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Detail label="Serial No." value={certificate.certificateId} />
              <Detail label="Issued on" value={formatDate(certificate.issuedAt)} />
              <Detail label="Score" value={`${certificate.score} / ${certificate.totalMarks}  (${certificate.percentage}%)`} />
              <Detail label="Verification" value={certificate.verificationCode} mono />
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={onPrint}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Download className="size-4" />Print / Save
          </button>
        </div>
      </div>

      {/* Hidden print layout — rendered into #print-certificate via a portal or ref; here we use a simpler approach: clicking print opens browser print dialog. For a real PDF the user can choose "Save as PDF" in the print dialog. */}
      <div className="hidden">
        <PrintCertificate certificate={certificate} />
      </div>
    </>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold text-slate-800 ${mono ? "font-mono tracking-wider" : ""}`}>{value}</p>
    </div>
  );
}

function PrintCertificate({ certificate }: { certificate: StudentCertificate }) {
  const modern = certificate.templateKey === "modern";
  return (
    <div className={`cert-border relative flex w-[297mm] max-w-full flex-col items-center overflow-hidden border p-12 text-center ${modern ? "border-teal-600 bg-white" : "border-[#143d36]/40 bg-[#fffdf7]"}`} style={{ aspectRatio: "297/210" }}>
      <div className={`absolute -left-20 -top-28 size-80 rounded-full border-[28px] ${modern ? "border-teal-100" : "border-[#d4f59b]/45"}`} />
      <div className="absolute -bottom-40 -right-20 size-96 rounded-full border-[30px] border-[#143d36]/10" />
      <div className="absolute inset-3 border border-[#c4a45b]/35" />
      <div className="flex items-center gap-3">
        <img src="/teza-tech-lab-logo.svg" alt="" className="size-10" />
        <span className="text-lg font-bold text-slate-800">Teza Tech Lab</span>
      </div>

      <div className={`mt-10 text-xs font-bold uppercase tracking-[0.25em] ${modern ? "text-teal-600" : "text-[#b08b37]"}`}>Certificate of Completion</div>

      <h1 className="mt-6 text-3xl font-bold text-slate-900">{certificate.studentName}</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        has successfully completed the course <strong className="text-slate-800">{certificate.courseTitle}</strong> ({certificate.batchName}){certificate.totalMarks > 0 ? <> by passing the final assessment with a score of <strong className="text-teal-700">{certificate.percentage}%</strong></> : null}.
      </p>

      <div className="mt-10 grid w-full max-w-md grid-cols-2 gap-6 text-left text-sm">
        <div>
          <p className="text-xs text-slate-400">Serial No.</p>
          <p className="mt-0.5 font-bold text-slate-800">{certificate.certificateId}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Issued</p>
          <p className="mt-0.5 font-bold text-slate-800">{formatDate(certificate.issuedAt)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Student ID</p>
          <p className="mt-0.5 font-bold text-slate-800">{certificate.studentCode}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Verification Code</p>
          <p className="mt-0.5 font-mono font-bold tracking-wider text-slate-800">{certificate.verificationCode}</p>
        </div>
      </div>

      <div className="mt-auto pt-8 text-xs text-slate-400">
        This certificate was issued by Teza Tech Lab. Verify at the administrator portal.
      </div>
    </div>
  );
}
