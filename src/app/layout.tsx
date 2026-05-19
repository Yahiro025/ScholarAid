import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className={`${plusJakarta.variable} ${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground flex flex-col min-h-screen`}
      >
        <Navbar />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
