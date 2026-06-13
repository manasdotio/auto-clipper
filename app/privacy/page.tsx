import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Auto Clipper',
  description: 'Auto Clipper is a 100% private, client-side video processing tool. We do not upload, store, or view your files.',
};

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <h1 className="text-4xl font-extrabold mb-8 tracking-normal">Privacy Policy</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-xl text-muted-foreground mb-8">
          At Auto Clipper, your privacy is our primary feature, not an afterthought.
        </p>

        <h2 className="text-2xl font-bold mt-12 mb-4">1. We Never Upload Your Files</h2>
        <p>
          Unlike traditional video editing platforms, Auto Clipper runs entirely within your web browser using WebAssembly. When you select a video to split, it is processed locally on your device's memory. We do not upload your media files to any cloud servers.
        </p>

        <h2 className="text-2xl font-bold mt-12 mb-4">2. We Don't Store Your Data</h2>
        <p>
          Because we never receive your files, we cannot store them. Once you close the browser tab or refresh the page, the temporary processed files are cleared from your browser's memory.
        </p>

        <h2 className="text-2xl font-bold mt-12 mb-4">3. Analytics</h2>
        <p>
          We use basic privacy-friendly analytics to understand how many people visit our site, but we cannot see what you are processing, how large your files are, or what settings you choose in the tool.
        </p>
      </div>
    </div>
  );
}
