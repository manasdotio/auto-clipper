import { Metadata } from 'next';
import VideoSplitter from "@/components/VideoSplitter";

export const metadata: Metadata = {
  title: 'Split Lecture Videos for Students | Auto Clipper',
  description: 'Divide long educational lectures or seminar recordings into topical chapters quickly and privately directly in your browser.',
};

export default function TeachersUseCase() {
  return (
    <div className="flex flex-col items-center w-full">
      <section className="w-full py-20 bg-muted/20 border-b">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
            Divide <span className="text-primary">Lecture Recordings</span> into Chapters
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Help your students learn better by splitting hour-long lectures into shorter, topical videos. Fast, free, and completely local so student privacy is maintained.
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
