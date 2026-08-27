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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-32x32.png",
    apple: "/icon-180x180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Teza Admin",
  },
};

export const viewport: Viewport = mobileResponsiveEnabled
  ? { width: "device-width", initialScale: 1, themeColor: "#0B1220" }
  : { width: desktopViewportWidth, initialScale: 1, themeColor: "#0B1220" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}><body><AdminProviders>{children}</AdminProviders></body></html>;
}
