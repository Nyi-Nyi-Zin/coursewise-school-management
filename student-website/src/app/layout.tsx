import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
  icons: {
    icon: "/icon-32x32.png",
    apple: "/icon-180x180.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Teza Student",
  },
};

export const viewport: Viewport = mobileResponsiveEnabled
  ? { width: "device-width", initialScale: 1, themeColor: "#0B1220" }
  : { width: desktopViewportWidth, initialScale: 1, themeColor: "#0B1220" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><Providers>{children}</Providers>{process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY ? <Script id="recaptcha-v3" src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY}`} strategy="afterInteractive" /> : null}</body>
    </html>
  );
}
