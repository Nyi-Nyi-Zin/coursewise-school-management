"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Loader2, Printer, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CertificateTemplate } from "@/components/certificate-template";

import {
  issueCertificate,
  listCertificates,
  type AdminCertificate,
  type IssueCertificateInput,
} from "@/lib/certificate-service";
import {
  loadAllBatches,
  loadCourses,
  loadEnrollmentsPage,
  loadStudentProfiles,
} from "@/lib/course-batch-service";

type CertificateDraft = IssueCertificateInput;

function localDate() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function newSerial() {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `TTL-${new Date().getFullYear()}-${suffix}`;
}

function emptyDraft(certificateId = ""): CertificateDraft {
  return {
    certificateId,
    studentId: "",
    studentName: "",
    studentCode: "",
    courseId: "",
    courseTitle: "",
    batchId: "",
    batchName: "",
    completionDate: localDate(),
    templateKey: "classic",
  };
}

function displayDate(value: string) {
  if (!value) return "Completion date";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function CertificateManager() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CertificateDraft>(emptyDraft);
  const [verificationCode, setVerificationCode] = useState("");

  const options = useQuery({
    queryKey: ["certificate-studio", "options"],
    queryFn: async () => {
      const [courses, batches, students, enrollments] = await Promise.all([
        loadCourses(),
        loadAllBatches(),
        loadStudentProfiles(),
        loadEnrollmentsPage(5_000),
      ]);
      return { courses, batches, students, enrollments: enrollments.items };
    },
  });
  const certificates = useQuery({
    queryKey: ["certificate-studio", "certificates"],
    queryFn: listCertificates,
  });
  const issue = useMutation({
    mutationFn: issueCertificate,
    onSuccess: certificate => {
      setVerificationCode(certificate.verificationCode);
      queryClient.setQueryData<AdminCertificate[]>(
        ["certificate-studio", "certificates"],
        current => [certificate, ...(current ?? [])],
      );
      toast.success("Certificate issued and published to the student portal.");
    },
    onError: error => toast.error(error instanceof Error ? error.message : "Certificate could not be issued."),
  });

  const data = options.data;
  const availableBatches = useMemo(
    () => data?.batches.filter(batch => batch.courseId === draft.courseId) ?? [],
    [data?.batches, draft.courseId],
  );
  const availableStudents = useMemo(() => {
    if (!data || !draft.courseId || !draft.batchId) return [];
    const studentIds = new Set(
      data.enrollments
        .filter(item => item.courseId === draft.courseId && item.batchId === draft.batchId && item.status === "active")
        .map(item => item.studentId),
    );
    return data.students.filter(student => studentIds.has(student.id));
  }, [data, draft.batchId, draft.courseId]);

  const selectCourse = (courseId: string) => {
    const course = data?.courses.find(item => item.id === courseId);
    setDraft(current => ({
      ...current,
      certificateId: current.certificateId || newSerial(),
      courseId,
      courseTitle: course?.title ?? "",
      batchId: "",
      batchName: "",
      studentId: "",
      studentName: "",
      studentCode: "",
    }));
    setVerificationCode("");
  };
  const selectBatch = (batchId: string) => {
    const batch = data?.batches.find(item => item.id === batchId);
    setDraft(current => ({
      ...current,
      batchId,
      batchName: batch?.name ?? "",
      studentId: "",
      studentName: "",
      studentCode: "",
    }));
    setVerificationCode("");
  };
  const selectStudent = (studentId: string) => {
    const student = data?.students.find(item => item.id === studentId);
    setDraft(current => ({
      ...current,
      studentId,
      studentName: student?.name ?? "",
      studentCode: student?.studentId ?? "",
    }));
    setVerificationCode("");
  };
  const showCertificate = (certificate: AdminCertificate) => {
    setDraft({
      certificateId: certificate.certificateId,
      studentId: certificate.studentId,
      studentName: certificate.studentName,
      studentCode: certificate.studentCode,
      courseId: certificate.courseId,
      courseTitle: certificate.courseTitle,
      batchId: certificate.batchId,
      batchName: certificate.batchName,
      completionDate: certificate.completionDate,
      templateKey: certificate.templateKey,
    });
    setVerificationCode(certificate.verificationCode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startNew = () => {
    setDraft(emptyDraft(newSerial()));
    setVerificationCode("");
  };
  const canIssue = Boolean(
    draft.studentId && draft.studentName && draft.studentCode && draft.courseId &&
    draft.courseTitle && draft.batchId && draft.batchName && draft.completionDate && draft.certificateId,
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(290px,0.7fr)_minmax(620px,1.3fr)]">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Dynamic fields</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Certificate details</h3>
            </div>
            {verificationCode ? (
              <button onClick={startNew} className="text-xs font-bold text-emerald-700 hover:text-emerald-900">New</button>
            ) : null}
          </div>

          {options.isLoading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-sm text-stone-400">
              <Loader2 className="size-4 animate-spin" /> Loading school records…
            </div>
          ) : options.isError ? (
            <p className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">Course, batch, and student records could not be loaded.</p>
          ) : (
            <div className="mt-6 space-y-4">
              <SelectField label="Course" value={draft.courseId} onChange={selectCourse}>
                <option value="">Select course</option>
                {data?.courses.map(course => <option key={course.id} value={course.id}>{course.title}</option>)}
              </SelectField>
              <SelectField label="Batch number" value={draft.batchId} onChange={selectBatch} disabled={!draft.courseId}>
                <option value="">Select batch</option>
                {availableBatches.map(batch => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
              </SelectField>
              <SelectField label="Student" value={draft.studentId} onChange={selectStudent} disabled={!draft.batchId}>
                <option value="">Select enrolled student</option>
                {availableStudents.map(student => <option key={student.id} value={student.id}>{student.name} · {student.studentId}</option>)}
              </SelectField>
              {draft.batchId && availableStudents.length === 0 ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">No active students are enrolled in this course and batch.</p>
              ) : null}
              <InputField label="Student name" value={draft.studentName} onChange={studentName => setDraft(current => ({ ...current, studentName }))} />
              <InputField label="Course name" value={draft.courseTitle} onChange={courseTitle => setDraft(current => ({ ...current, courseTitle }))} />
              <InputField label="Batch number" value={draft.batchName} onChange={batchName => setDraft(current => ({ ...current, batchName }))} />
              <InputField label="Completion date" type="date" value={draft.completionDate} onChange={completionDate => setDraft(current => ({ ...current, completionDate }))} />
              <InputField label="Certificate serial ID" value={draft.certificateId} onChange={certificateId => setDraft(current => ({ ...current, certificateId }))} mono />
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button
              onClick={() => issue.mutate(draft)}
              disabled={!canIssue || issue.isPending || Boolean(verificationCode)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {issue.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {verificationCode ? "Issued" : "Issue certificate"}
            </button>
            <button
              onClick={() => window.print()}
              disabled={!draft.studentName || !draft.courseTitle}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 disabled:opacity-45"
            >
              <Printer className="size-4" /> Print / Save PDF
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-400">Issuing saves this certificate to Firebase and makes it available in the selected student’s portal.</p>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Base template</p>
              <h3 className="mt-1 font-display text-xl font-semibold">Live preview</h3>
            </div>
          </div>
          <CertificatePreview draft={draft} verificationCode={verificationCode} />
        </section>
      </div>

      <section className="rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 lg:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-emerald-700">Issued archive</p>
            <h3 className="mt-1 font-display text-xl font-semibold">Student certificates</h3>
          </div>
          <span className="text-sm font-semibold text-stone-400">{certificates.data?.length ?? 0} total</span>
        </div>
        {certificates.isLoading ? (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-stone-400"><Loader2 className="size-4 animate-spin" /> Loading certificates…</div>
        ) : certificates.isError ? (
          <p className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">Issued certificates could not be loaded.</p>
        ) : certificates.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-stone-50 text-[10px] uppercase tracking-wider text-stone-400">
                <tr><th className="px-6 py-3">Student</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Serial ID</th><th className="px-6 py-3 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {certificates.data.map(certificate => (
                  <tr key={certificate.id} className="hover:bg-stone-50/70">
                    <td className="px-6 py-4"><p className="font-bold text-stone-800">{certificate.studentName}</p><p className="text-xs text-stone-400">{certificate.studentCode}</p></td>
                    <td className="px-4 py-4 font-medium text-stone-700">{certificate.courseTitle}</td>
                    <td className="px-4 py-4 text-stone-500">{certificate.batchName}</td>
                    <td className="px-4 py-4 text-stone-500">{displayDate(certificate.completionDate)}</td>
                    <td className="px-4 py-4 font-mono text-xs font-medium text-stone-600">{certificate.certificateId}</td>
                    <td className="px-6 py-4 text-right"><button onClick={() => showCertificate(certificate)} className="font-bold text-emerald-700 hover:text-emerald-900">View / print</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-36 flex-col items-center justify-center text-center"><Award className="size-7 text-stone-300" /><p className="mt-2 text-sm font-semibold text-stone-500">No certificates issued yet</p></div>
        )}
      </section>
    </div>
  );
}

function CertificatePreview({ draft, verificationCode }: { draft: CertificateDraft; verificationCode: string }) {
  return (
    <>
      <CertificateTemplate
        id="certificate-print-area"
        studentName={draft.studentName}
        courseTitle={draft.courseTitle}
        batchName={draft.batchName}
        issuedDate={displayDate(draft.completionDate)}
        certificateId={draft.certificateId}
        verificationCode={verificationCode}
      />
      <style jsx global>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { width: 297mm; height: 210mm; background: white !important; }
          body * { visibility: hidden !important; }
          #certificate-print-area, #certificate-print-area * { visibility: visible !important; }
          #certificate-print-area { position: fixed !important; inset: 0 !important; width: 297mm !important; height: 210mm !important; box-shadow: none !important; }
        }
      `}</style>
    </>
  );
}

function SelectField({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-stone-700">{label}
      <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium outline-none focus:border-emerald-600 disabled:bg-stone-50 disabled:text-stone-400">{children}</select>
    </label>
  );
}

function InputField({ label, value, onChange, type = "text", mono }: { label: string; value: string; onChange: (value: string) => void; type?: string; mono?: boolean }) {
  return (
    <label className="block text-sm font-bold text-stone-700">{label}
      <input type={type} value={value} onChange={event => onChange(event.target.value)} className={`mt-2 h-11 w-full rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-emerald-600 ${mono ? "font-mono" : ""}`} />
    </label>
  );
}
