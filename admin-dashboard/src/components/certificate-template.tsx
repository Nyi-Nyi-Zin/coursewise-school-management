import Image from "next/image";

export type CertificateTemplateProps = {
  id?: string;
  studentName: string;
  courseTitle: string;
  batchName?: string;
  issuedDate: string;
  certificateId: string;
  verificationCode?: string;
  className?: string;
};

export function CertificateTemplate({
  id,
  studentName,
  courseTitle,
  batchName,
  issuedDate,
  certificateId,
  verificationCode,
  className = "",
}: CertificateTemplateProps) {
  const recipient = studentName || "STUDENT NAME";
  const course = courseTitle || "COURSE NAME";
  return (
    <div
      id={id}
      className={`certificate-template relative aspect-[297/210] w-full overflow-hidden bg-[#fbfcfe] font-sans text-[#092b43] shadow-[0_24px_70px_rgba(9,43,67,.13)] ${className}`}
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute inset-[2.7%] border-[0.32cqw] border-[#092b43]" />
      <div className="absolute inset-[3.35%] border-[0.18cqw] border-[#1599ed]" />
      <div className="absolute left-[3.05%] top-[2.35%] h-[2.5%] w-[13%] border-l-[0.3cqw] border-t-[0.3cqw] border-[#092b43]" />
      <div className="absolute bottom-[2.35%] right-[3.05%] h-[2.5%] w-[13%] border-b-[0.3cqw] border-r-[0.3cqw] border-[#092b43]" />

      <div className="pointer-events-none absolute left-1/2 top-[52%] size-[39cqw] -translate-x-1/2 -translate-y-1/2 opacity-[0.12]">
        <div className="absolute inset-[7%] rounded-full border-[0.16cqw] border-[#188ed5]" />
        <div className="absolute inset-[19%] rounded-full border-[0.16cqw] border-[#188ed5]" />
        <div className="absolute inset-[34%] rounded-full border-[0.16cqw] border-[#188ed5]" />
        <div className="absolute left-1/2 top-0 h-full w-[0.14cqw] -translate-x-1/2 rotate-[32deg] bg-[#188ed5]" />
        <div className="absolute left-1/2 top-0 h-full w-[0.14cqw] -translate-x-1/2 -rotate-[32deg] bg-[#188ed5]" />
        <div className="absolute left-0 top-1/2 h-[0.14cqw] w-full -translate-y-1/2 rotate-[17deg] bg-[#188ed5]" />
      </div>

      <div className="absolute inset-x-[7.2%] top-[5.2%] flex flex-col items-center text-center">
        <div className="flex items-center gap-[1.5cqw]">
          <Image src="/teza-tech-lab-logo.svg" alt="Teza Tech Lab" width={96} height={96} className="size-[8cqw] rounded-[1.5cqw]" priority />
          <div className="text-left">
            <p className="text-[4.2cqw] font-extrabold leading-none tracking-[0.02em] text-[#0b1220]">Teza Tech Lab</p>
            <p className="mt-[0.65cqw] text-[1.65cqw] font-bold tracking-[0.19em] text-[#148fc5]">IT &amp; KNOWLEDGE SHARING</p>
          </div>
        </div>
        <h2 className="mt-[3.7cqw] font-serif text-[3.05cqw] font-medium leading-none text-[#0a3550]">CERTIFICATE OF COMPLETION</h2>
        <p className="mt-[3.3cqw] font-serif text-[1.45cqw] text-[#62676b]">THIS CERTIFICATE IS AWARDED TO</p>
        <h3 className="mt-[0.9cqw] max-w-[76cqw] text-[3.45cqw] font-black uppercase leading-none text-[#062b44]">{recipient}</h3>
        <p className="mt-[3.7cqw] text-[1.65cqw] font-light tracking-[0.38em] text-[#676b70]">For successfully completing the Course</p>
        <p className="mt-[0.45cqw] max-w-[91cqw] text-[2.65cqw] font-medium uppercase leading-tight text-[#078cff]">{course}</p>
        <p className="mt-[2.7cqw] max-w-[83cqw] text-[1.2cqw] leading-[1.7] text-[#44484c]">
          This certifies that <strong>{recipient}</strong> has met all requirements and has demonstrated a comprehensive understanding of the course material
          {batchName ? <> in <strong>{batchName}</strong></> : null}.
        </p>
      </div>

      <div className="absolute bottom-[7.2%] left-[7.2%] flex items-end gap-[1.4cqw]">
        <Image src="/certificate-seal.png" alt="Teza Tech Lab official seal" width={220} height={225} className="size-[14.5cqw] object-contain" />
        <dl className="mb-[0.8cqw] space-y-[0.32cqw] text-[0.95cqw] leading-tight text-[#44484c]">
          <div><dt className="inline font-extrabold">ISSUED BY: </dt><dd className="inline">Teza Tech Lab</dd></div>
          <div><dt className="inline font-extrabold">ISSUE DATE: </dt><dd className="inline">{issuedDate}</dd></div>
          <div><dt className="inline font-extrabold">CERTIFICATE ID: </dt><dd className="inline font-mono">{certificateId || "CERTIFICATE ID"}</dd></div>
          <div><dt className="inline font-extrabold text-[#078cff]">VERIFY: </dt><dd className="inline font-mono text-[#078cff]">{verificationCode || "www.tezatechlab.com"}</dd></div>
        </dl>
      </div>

      <div className="absolute bottom-[6.8%] right-[7.2%] w-[18cqw] text-center">
        <Image src="/certificate-signature.png" alt="Authorized signature" width={300} height={134} className="mx-auto h-[8cqw] w-[17cqw] object-contain" />
        <div className="border-t-[0.14cqw] border-[#24475d] pt-[0.6cqw]">
          <p className="text-[1.1cqw] font-extrabold leading-none text-[#1f2529]">Hein Tay Zar</p>
          <p className="mt-[0.35cqw] text-[0.9cqw] text-[#343a3e]">Founder / Instructor</p>
        </div>
      </div>
    </div>
  );
}
