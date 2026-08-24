import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";
import { AdminProviders } from "./providers";
import { desktopViewportWidth, mobileResponsiveEnabled } from "../../../shared/portal-display-settings";

const sans = DM_Sans({ variable: "--font-course-sans", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-course-display", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-course-mono", weight: ["400", "500"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Teza Tech Lab | Admin",
  description: "Teza Tech Lab school and course management workspace.",
  icons: {
    icon: "/teza-tech-lab-logo.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = mobileResponsiveEnabled
  ? { width: "device-width", initialScale: 1 }
  : { width: desktopViewportWidth, initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}><body><AdminProviders>{children}</AdminProviders></body></html>;
}
