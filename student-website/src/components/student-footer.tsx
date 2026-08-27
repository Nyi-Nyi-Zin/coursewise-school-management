import { Mail, Phone, ShieldCheck } from "lucide-react";

export function StudentFooter() {
  return (
    <footer className="bg-[var(--nav)] text-slate-300">
      <div className="mx-auto grid max-w-[1480px] items-center gap-3 px-4 py-5 text-xs sm:px-6 lg:grid-cols-3 lg:px-10">
        <p className="flex items-center justify-center gap-2 lg:justify-start">
          <ShieldCheck className="size-4 text-teal-400" />
          Designed &amp; developed by <a href="https://nyinyizin-portfolio.vercel.app/" target="_blank" rel="noreferrer" className="font-semibold text-white hover:text-teal-300">Cloud Nine</a>
        </p>
        <div className="flex items-center justify-center gap-5 text-white">
          <a href="mailto:nyinyizin1818@gmail.com" className="inline-flex items-center gap-1.5 transition-colors hover:text-teal-300"><Mail className="size-4 text-teal-400" />nyinyizin1818@gmail.com</a>
          <a href="tel:+2519675507310" className="inline-flex items-center gap-1.5 transition-colors hover:text-teal-300"><Phone className="size-4 text-teal-400" />09675507310</a>
        </div>
        <p className="flex items-center justify-center gap-2 text-slate-400 lg:justify-end">
          © {new Date().getFullYear()} Cloud Nine. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
