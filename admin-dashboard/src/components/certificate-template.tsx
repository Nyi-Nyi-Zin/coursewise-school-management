import Image from "next/image";

export type CertificateTemplateProps = {
  id?: string;
  studentName: string;
  courseTitle: string;
  batchName?: string;
  courseDescription?: string;
  issuedDate: string;
  certificateId: string;
  verificationCode?: string;
  className?: string;
};

export function CertificateTemplate({
  id,
  studentName,
  courseTitle,
  courseDescription,
  issuedDate,
  certificateId,
  verificationCode,
  className = "",
}: CertificateTemplateProps) {
  const recipient = studentName || "STUDENT NAME";
  const course = courseTitle || "COURSE NAME";
  const description = courseDescription || "COURSE DESCRIPTION";
  return (
    <div
      id={id}
      className={`certificate-template relative aspect-[297/210] w-full overflow-hidden bg-[#fbfcfe] font-sans text-[#092b43] shadow-[0_24px_70px_rgba(9,43,67,.13)] ${className}`}
      style={{ containerType: "inline-size" }}
    >
      <div className="absolute inset-x-[2.7%] inset-y-[3.8%] border-[0.32cqw] border-[#092b43]" />
      <div className="absolute inset-x-[3.35%] inset-y-[4.7%] border-[0.18cqw] border-[#1599ed]" />
      <div className="absolute left-[3.05%] top-[3.8%] h-[2.5%] w-[13%] border-l-[0.3cqw] border-t-[0.3cqw] border-[#092b43]" />
      <div className="absolute bottom-[3.8%] right-[3.05%] h-[2.5%] w-[13%] border-b-[0.3cqw] border-r-[0.3cqw] border-[#092b43]" />

      <CertificateWatermark />

      <div className="absolute inset-x-[7.2%] top-[5.3cqw] z-[2] flex flex-col items-center text-center">
        <div className="flex items-center gap-[1.5cqw]">
          <Image src="/certificate-logo-transparent.png" alt="Teza Tech Lab" width={1287} height={1222} className="size-[8cqw] object-contain" preload />
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
          This certifies that&nbsp;&nbsp;&nbsp; <strong>{recipient}</strong>&nbsp;&nbsp;&nbsp; has met all requirements and has demonstrated a comprehensive unde of the subject matter, including <strong>{description}</strong>
        </p>
      </div>

      <div className="absolute bottom-[4.6cqw] left-[7.2%] z-[2]">
        <Image src="/certificate-seal-transparent.png" alt="Teza Tech Lab official seal" width={564} height={528} className="mb-[1.35cqw] size-[12.8cqw] rounded-full object-cover" />
        <dl className="space-y-[0.32cqw] text-[0.95cqw] leading-tight text-[#44484c]">
          <div><dt className="inline font-extrabold">ISSUED BY: </dt><dd className="inline">Teza Tech Lab</dd></div>
          <div><dt className="inline font-extrabold">ISSUE DATE: </dt><dd className="inline">{issuedDate}</dd></div>
          <div><dt className="inline font-extrabold">CERTIFICATE ID: </dt><dd className="inline font-mono">{certificateId || "CERTIFICATE ID"}</dd></div>
          <div><dt className="inline font-extrabold text-[#078cff]">VERIFY: </dt><dd className="inline font-mono text-[#078cff]">{verificationCode || "www.tezatechlab.com"}</dd></div>
        </dl>
      </div>

      <div className="absolute bottom-[5.4cqw] right-[7.2%] z-[2] w-[18cqw] text-center">
        <Image src="/certificate-signature.png" alt="Authorized signature" width={300} height={134} className="mx-auto h-[8cqw] w-[17cqw] object-contain" />
        <div className="border-t-[0.14cqw] border-[#24475d] pt-[0.6cqw]">
          <p className="text-[1.1cqw] font-extrabold leading-none text-[#1f2529]">Hein Tay Zar</p>
          <p className="mt-[0.35cqw] text-[0.9cqw] text-[#343a3e]">Founder / Instructor</p>
        </div>
      </div>
    </div>
  );
}

function CertificateWatermark() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[1] w-[min(560px,56cqw)] -translate-x-1/2 -translate-y-1/2 opacity-[0.13]" focusable="false" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke="#0055AA" strokeWidth="1">
        <path d="M40,200 C40,90 160,50 200,200 C240,350 360,310 360,200" strokeWidth="1.2" strokeDasharray="6,3" />
        <path d="M200,40 C90,40 50,160 200,200 C350,240 310,360 200,360" strokeWidth="1.2" />
        <path d="M70,100 Q200,200 330,100" strokeWidth="0.9" strokeDasharray="4,4" />
        <path d="M70,300 Q200,200 330,300" strokeWidth="0.9" strokeDasharray="4,4" />
        <path d="M100,70 Q200,200 100,330" strokeWidth="0.9" />
        <path d="M300,70 Q200,200 300,330" strokeWidth="0.9" />
        <circle cx="200" cy="200" r="150" strokeWidth="0.7" strokeDasharray="3,3" />
        <circle cx="200" cy="200" r="110" strokeWidth="0.9" />
        <circle cx="200" cy="200" r="70" strokeWidth="0.6" strokeDasharray="2,2" />
        <circle cx="200" cy="200" r="30" strokeWidth="1" />
        <g fill="#0055AA" stroke="none">
          <circle cx="200" cy="200" r="5" /><circle cx="200" cy="50" r="3.5" /><circle cx="200" cy="350" r="3.5" /><circle cx="50" cy="200" r="3.5" /><circle cx="350" cy="200" r="3.5" />
          <circle cx="90" cy="90" r="3" /><circle cx="310" cy="90" r="3" /><circle cx="90" cy="310" r="3" /><circle cx="310" cy="310" r="3" />
          <circle cx="200" cy="130" r="2.5" /><circle cx="200" cy="270" r="2.5" /><circle cx="130" cy="200" r="2.5" /><circle cx="270" cy="200" r="2.5" />
        </g>
      </g>
    </svg>
  );
}
