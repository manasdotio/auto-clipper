import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import ThemeToggle from "@/components/ThemeToggle";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Clipper – Split Video Into Clips Instantly | Free, No Upload",
  description: "Split any video into equal parts or custom clips instantly in your browser. No uploads, no account, no watermark. Free forever. Powered by FFmpeg.",
  openGraph: {
    title: "Auto Clipper – Split Video Into Clips Instantly | Free, No Upload",
    description: "Split any video into equal parts or custom clips instantly in your browser. No uploads, no account, no watermark. Free forever. Powered by FFmpeg.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Auto Clipper",
        "operatingSystem": "Any",
        "applicationCategory": "MultimediaApplication",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is Auto Clipper safe?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, it is completely safe. Auto Clipper runs entirely in your browser using FFmpeg.wasm. Your video files never leave your device and are never uploaded to any server."
            }
          },
          {
            "@type": "Question",
            "name": "How to split a video into equal parts?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Simply upload your video, select the 'Equal Parts' option, enter the number of clips you want, and click 'Split Video'."
            }
          }
        ]
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  if (theme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })()
            `
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body bg-bg text-text-1 selection:bg-accent/30">
        <header className="sticky top-0 z-50 w-full border-b border-border bg-bg/80 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            {/* Logo Left */}
            <div className="flex items-center gap-2 font-display font-bold text-xl text-text-1">
              <span className="text-2xl">✂️</span> Auto Clipper
            </div>
            
            {/* Links Center */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-2">
              <a href="/how-it-works" className="hover:text-text-1 transition-colors">How It Works</a>
              <a href="/#features" className="hover:text-text-1 transition-colors">Features</a>
              <a href="/blog" className="hover:text-text-1 transition-colors">Blog</a>
            </nav>
            
            {/* CTA Right */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <a 
                href="/#tool" 
                className="inline-flex items-center justify-center bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:brightness-110"
                style={{ boxShadow: '0 0 20px rgba(108,99,255,0.4)' }}
              >
                Try It Free →
              </a>
            </div>
          </div>
        </header>
        
        <main className="flex-1 w-full max-w-6xl mx-auto flex flex-col items-center">
          {children}
        </main>
        
        <footer className="w-full border-t border-border mt-24">
          <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col items-center justify-center space-y-4">
            {/* Links Row */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-text-2">
              <a href="/privacy" className="hover:text-text-1 transition-colors">Privacy Policy</a>
              <a href="/how-it-works" className="hover:text-text-1 transition-colors">How It Works</a>
              <a href="/blog" className="hover:text-text-1 transition-colors">Blog</a>
              <a href="#" className="hover:text-text-1 transition-colors">GitHub</a>
            </div>
            {/* Copyright Row */}
            <div className="text-center space-y-1">
              <p className="text-text-2 text-xs">© 2026 Auto Clipper. All rights reserved.</p>
              <p className="text-text-2 text-xs font-medium">Powered by FFmpeg.wasm · No data leaves your browser</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
