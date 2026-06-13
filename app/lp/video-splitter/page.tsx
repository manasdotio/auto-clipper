import { Metadata } from 'next';
import VideoSplitter from "@/components/VideoSplitter";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: 'Free Video Splitter - Fast, No Upload | Auto Clipper',
  description: 'Split your videos instantly. No wait times, no uploads, no watermark. Free forever.',
};

export default function AdsLandingPage() {
  return (
    <div className="flex flex-col items-center w-full bg-background min-h-screen">
      <main className="w-full flex-1">
        <section className="w-full py-16 lg:py-24 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10"></div>
          
          <div className="flex items-center gap-2 font-bold text-xl text-primary tracking-tight mb-12">
            <div className="size-8 rounded-md bg-primary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-primary-foreground"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>
            </div>
            Auto Clipper
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight max-w-4xl mb-6">
            Split Any Video Into Clips <br className="hidden sm:block" />
            <span className="text-primary underline decoration-primary/30 underline-offset-8">Instantly & Privately</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mb-10">
            No slow cloud uploads. No file size limits. No watermark. <br/> Works entirely inside your browser in seconds.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-16">
            <span className="inline-flex items-center gap-2 text-foreground font-medium">
              <ShieldCheck className="size-5 text-green-500" /> 100% Secure (Local)
            </span>
            <span className="inline-flex items-center gap-2 text-foreground font-medium">
              <CheckCircle2 className="size-5 text-green-500" /> No Registration
            </span>
            <span className="inline-flex items-center gap-2 text-foreground font-medium">
              <Zap className="size-5 text-green-500" /> Lightning Fast
            </span>
          </div>

          <div className="w-full max-w-4xl mx-auto rounded-xl border bg-card text-card-foreground shadow-2xl">
            <div className="p-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-xl rounded-b-none" />
            <VideoSplitter />
          </div>
        </section>
      </main>

      <footer className="w-full border-t py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Auto Clipper. 100% Free Forever.</p>
      </footer>
    </div>
  );
}
