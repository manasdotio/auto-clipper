import { Metadata } from 'next';
import VideoSplitter from "@/components/VideoSplitter";

export const metadata: Metadata = {
  title: 'Split Videos for YouTube Shorts and TikTok | Auto Clipper',
  description: 'Repurpose your long-form YouTube videos or Twitch streams into perfectly sized Shorts, Reels, or TikToks instantly in your browser.',
};

export default function ContentCreatorsUseCase() {
  return (
    <div className="flex flex-col items-center w-full">
      <section className="w-full py-20 bg-muted/20 border-b">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Turn Long Videos Into <span className="text-primary">Viral Shorts</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            The fastest way for content creators to split YouTube videos, Twitch VODs, and podcast recordings into bite-sized clips for TikTok, Instagram Reels, and YouTube Shorts.
          </p>
        </div>
      </section>

      <section className="w-full py-16">
        <div className="w-full max-w-5xl mx-auto rounded-xl border bg-card text-card-foreground shadow-2xl shadow-primary/5">
          <VideoSplitter />
        </div>
      </section>
    </div>
  );
}
