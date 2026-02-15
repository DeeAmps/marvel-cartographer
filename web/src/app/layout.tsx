import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileNav from "@/components/layout/MobileNav";
import BackToTop from "@/components/ui/BackToTop";
import KeyboardShortcuts from "@/components/ui/KeyboardShortcuts";
import AuthProvider from "@/components/auth/AuthProvider";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import WatcherFAB from "@/components/watcher/WatcherFAB";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Marvel Cartographer",
    template: "%s | The Marvel Cartographer",
  },
  description:
    "Map the entire Marvel Universe from Fantastic Four #1 (1961) to current ongoings. Interactive chronology engine with reading paths, continuity mapping, and collected edition guides.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cartographer",
  },
  openGraph: {
    title: "The Marvel Cartographer",
    description:
      "Map the entire Marvel Universe from Fantastic Four #1 (1961) to current ongoings.",
    siteName: "The Marvel Cartographer",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Marvel Cartographer",
    description:
      "Map the entire Marvel Universe from Fantastic Four #1 (1961) to current ongoings.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#08090d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${bricolage.variable} ${geistMono.variable} antialiased min-h-screen`}
        style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
          style={{ background: "var(--accent-red)", color: "#fff" }}
        >
          Skip to main content
        </a>
        <AuthProvider>
          <Header />
          <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 md:pb-8">
            {children}
          </main>
          <Footer />
          <MobileNav />
          <BackToTop />
          <KeyboardShortcuts />
          <InstallPrompt />
          <Suspense fallback={null}>
            <WatcherFAB />
          </Suspense>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-default)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
