import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DynamicNavbar from "./components/DynamicNavbar";
import { getCanonicalBase } from "./lib/domain";
import PreloadResources from "./components/PreloadResources";
import GoogleAnalytics from "./components/GoogleAnalytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const base = await getCanonicalBase();
  return {
    title: "123Movies - Watch Movies Online Free | HD Movie Streaming",
    description: "Watch thousands of movies online for free. Download HD movies, stream latest releases, and discover your favorite films. No registration required.",
    keywords: "watch movies online free, download movies HD, movie streaming, free movies online, HD movies, latest movies, movie downloads, online cinema, streaming movies, free movie site",
    authors: [{ name: "123Movies" }],
    creator: "123Movies",
    publisher: "123Movies",
    icons: {
      icon: '/favicon.svg',
      shortcut: '/favicon.svg',
      apple: '/favicon.svg',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: base,
      siteName: '123Movies',
      title: '123Movies - Watch Movies Online Free | HD Movie Streaming',
      description: 'Watch thousands of movies online for free. Download HD movies, stream latest releases, and discover your favorite films. No registration required.',
    },
    twitter: {
      card: 'summary_large_image',
      title: '123Movies - Watch Movies Online Free | HD Movie Streaming',
      description: 'Watch thousands of movies online for free. Download HD movies, stream latest releases, and discover your favorite films. No registration required.',
    },
    alternates: {
      canonical: base,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PreloadResources />
        <meta name="google-site-verification" content="Rrslj5ata6gbyF-nUCpM4zq_bqWJc1PMrOd-EkuqF28" />
        <meta name="msvalidate.01" content="CA9C80743C5C403924230A48CF321E7C" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''} />
        <DynamicNavbar />
        {children}
      </body>
    </html>
  );
}
