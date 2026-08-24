import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { desktopViewportWidth, mobileResponsiveEnabled } from "../../../shared/portal-display-settings";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Teza Tech Lab | Student Portal",
  description: "A focused learning portal for Teza Tech Lab students.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  icons: {
    icon: "/teza-tech-lab-logo.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = mobileResponsiveEnabled
  ? { width: "device-width", initialScale: 1 }
  : { width: desktopViewportWidth, initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers></body>
    </html>
  );
}
