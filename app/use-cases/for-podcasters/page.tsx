import { Metadata } from 'next';
import VideoSplitter from "@/components/VideoSplitter";

export const metadata: Metadata = {
  title: 'Split Podcast Videos for Social Media | Auto Clipper',
  description: 'Easily cut long podcast video recordings into smaller, episodic clips or social media highlights instantly in your browser.',
};

export default function PodcastersUseCase() {
  return (
    <div className="flex flex-col items-center w-full">
      <section className="w-full py-20 bg-muted/20 border-b">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Split <span className="text-primary">Podcast Recordings</span> Instantly
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Divide your 2-hour podcast recordings into multiple episodes or short teaser clips for social media. Zero uploads required, meaning maximum privacy for unreleased content.
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
