import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Split a Video Online | Auto Clipper Tutorial',
  description: 'Learn how to split any video into equal parts or custom clips instantly in your browser without uploading your files. A step-by-step tutorial.',
};

export default function HowItWorks() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-3xl">
      <h1 className="text-4xl font-extrabold mb-8 tracking-normal">How to Split a Video Online (Without Uploading)</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-xl text-muted-foreground mb-12">
          Most online video splitters force you to upload your gigabytes of video to their cloud servers. 
          Auto Clipper works differently. By using a technology called <strong>FFmpeg.wasm</strong>, we run 
          the video splitting engine directly inside your web browser.
        </p>

        <h2 className="text-2xl font-bold mt-12 mb-6">Step 1: Select Your Video File</h2>
        <p>
          Click the upload area on our homepage and choose your video. Because there is no server upload, 
          this step is instantaneous, regardless of whether your video is 50MB or 2GB. 
          Your file remains safely on your computer.
        </p>

        <h2 className="text-2xl font-bold mt-12 mb-6">Step 2: Choose Your Split Method</h2>
        <p>You have two options for splitting your video:</p>
        <ul className="list-disc pl-6 space-y-2 mt-4 mb-8">
          <li><strong>Equal Parts:</strong> Perfect for dividing a long video into segments of equal length. Just specify the number of clips you want.</li>
          <li><strong>Custom Clips:</strong> Ideal for extracting specific highlights. Add exact start and end timestamps for each clip you want to create.</li>
        </ul>

        <h2 className="text-2xl font-bold mt-12 mb-6">Step 3: Process and Download</h2>
        <p>
          Click "Split Video". Your browser will now do the heavy lifting using your device's processor. 
          Once finished, the clips will be bundled into a ZIP file (if multiple) and automatically downloaded 
          to your local storage.
        </p>
      </div>
    </div>
  );
}
