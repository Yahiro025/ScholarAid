import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarAId - AI-Powered Scholarship Finder for Filipino Students",
  description: "Discover scholarships you qualify for, check your eligibility instantly with AI, and prepare for college entrance exams — all designed for senior high school students in the Philippines.",
  keywords: ["ScholarAId", "scholarship", "Filipino students", "senior high school", "AI", "eligibility checker", "exam reviewer", "Philippines"],
  authors: [{ name: "ScholarAId Team" }],
  icons: {
    icon: "/scholaraid-logo.png",
  },
  openGraph: {
    title: "ScholarAId - AI-Powered Scholarship Finder",
    description: "Find scholarships, check eligibility, and review for exams with AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ScholarAId - AI-Powered Scholarship Finder",
    description: "Find scholarships, check eligibility, and review for exams with AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
