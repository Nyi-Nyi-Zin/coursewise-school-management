import type { Metadata } from "next";
import { DM_Mono, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-course-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-course-display", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-course-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coursewise Admin",
  description: "School and course management administration workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}><body>{children}</body></html>;
}
