import VideoSplitter from "@/components/VideoSplitter";
import { CheckCircle2, ShieldCheck, Zap, Download, Scissors, Upload, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <div className="flex flex-col items-center w-full relative">
      {/* Hero Section */}
      <section className="w-full pt-32 pb-16 flex flex-col items-center justify-center text-center px-4 relative z-10 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-glow text-accent text-sm font-semibold mb-8">
          <ShieldCheck className="w-4 h-4" /> 100% Private
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-normal max-w-4xl mb-6 text-text-1 leading-tight">
          Split Any Video Into Clips <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-400">
            Automatically
          </span>
        </h1>
        
        <p className="text-xl text-text-2 max-w-2xl mb-12">
          Split any video into equal parts or custom clips instantly in your browser. <br className="hidden sm:block" />
          <strong className="text-text-1 font-medium">No uploads, no account, no watermark. Free forever.</strong>
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 mb-16">
          <span className="flex items-center gap-2 text-text-1 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-accent" /> No Upload
          </span>
          <span className="flex items-center gap-2 text-text-1 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-accent" /> No Account
          </span>
          <span className="flex items-center gap-2 text-text-1 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-accent" /> No Watermark
          </span>
          <span className="flex items-center gap-2 text-text-1 text-sm font-medium">
            <Zap className="w-5 h-5 text-accent" /> Free Forever
          </span>
        </div>

        {/* Embedded Tool */}
        <div id="tool" className="w-full">
          <VideoSplitter />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="w-full py-24 bg-surface-2 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-normal mb-4 text-text-1">How It Works</h2>
            <p className="text-text-2 text-lg">Three simple steps to split your videos securely in your browser.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-0.5 bg-border -z-10"></div>
            
            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl border border-border relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 text-[120px] font-bold text-border/30 group-hover:text-accent-glow transition-colors select-none">1</div>
              <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center mb-6 relative z-10 border border-accent/20">
                <Upload className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-1 relative z-10">Upload Video</h3>
              <p className="text-text-2 relative z-10">Select any video file from your device. It stays locally in your browser.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl border border-border relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 text-[120px] font-bold text-border/30 group-hover:text-accent-glow transition-colors select-none">2</div>
              <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center mb-6 relative z-10 border border-accent/20">
                <Scissors className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-1 relative z-10">Set Clips</h3>
              <p className="text-text-2 relative z-10">Choose to split by equal parts or define exact custom timestamps.</p>
            </div>

            <div className="flex flex-col items-center text-center p-8 bg-surface rounded-2xl border border-border relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 text-[120px] font-bold text-border/30 group-hover:text-accent-glow transition-colors select-none">3</div>
              <div className="w-16 h-16 rounded-full bg-accent-glow flex items-center justify-center mb-6 relative z-10 border border-accent/20">
                <Download className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-text-1 relative z-10">Download</h3>
              <p className="text-text-2 relative z-10">Get your high-quality split clips instantly, ready for use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Why Auto Clipper */}
      <section id="features" className="w-full py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-normal mb-6 text-text-1">Why Auto Clipper?</h2>
              <p className="text-lg text-text-2 mb-10">
                Most video splitters force you to upload your large files to their servers, making you wait in queues and putting your privacy at risk. Auto Clipper is different.
              </p>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  <div className="p-2 bg-accent-glow rounded-lg">
                    <ShieldCheck className="w-6 h-6 text-accent shrink-0" />
                  </div>
                  <div>
                    <strong className="block text-text-1 text-lg mb-1">100% Privacy</strong>
                    <span className="text-text-2">Powered by FFmpeg.wasm, your files are processed directly in your browser. They never leave your device.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="p-2 bg-accent-glow rounded-lg">
                    <Zap className="w-6 h-6 text-accent shrink-0" />
                  </div>
                  <div>
                    <strong className="block text-text-1 text-lg mb-1">Lightning Fast</strong>
                    <span className="text-text-2">No upload or download wait times. Processing speed depends entirely on your local machine.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="p-2 bg-accent-glow rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
                  </div>
                  <div>
                    <strong className="block text-text-1 text-lg mb-1">No Limits</strong>
                    <span className="text-text-2">Split as many videos as you want. There are no file size limits tied to an arbitrary server constraint.</span>
                  </div>
                </li>
              </ul>
            </div>
            
            {/* Comparison Table */}
            <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
              <h3 className="text-xl font-bold mb-8 text-center text-text-1">Comparison</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="font-semibold text-text-2 flex-1">Feature</span>
                  <span className="font-bold text-accent w-1/3 text-center">Auto Clipper</span>
                  <span className="font-semibold text-text-2 w-1/3 text-right">Cloud Tools</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="font-medium text-text-1 flex-1">File Upload Required?</span>
                  <span className="text-green font-bold flex items-center justify-center gap-1 w-1/3"><CheckCircle2 className="w-4 h-4"/> No</span>
                  <span className="text-red font-medium flex items-center justify-end gap-1 w-1/3">Yes</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="font-medium text-text-1 flex-1">Privacy Guaranteed?</span>
                  <span className="text-green font-bold flex items-center justify-center gap-1 w-1/3"><CheckCircle2 className="w-4 h-4"/> Yes</span>
                  <span className="text-red font-medium flex items-center justify-end gap-1 w-1/3">No</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="font-medium text-text-1 flex-1">Watermarks?</span>
                  <span className="text-green font-bold flex items-center justify-center gap-1 w-1/3"><CheckCircle2 className="w-4 h-4"/> None</span>
                  <span className="text-red font-medium flex items-center justify-end gap-1 w-1/3">Usually</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-medium text-text-1 flex-1">Cost</span>
                  <span className="text-green font-bold flex items-center justify-center gap-1 w-1/3">Free</span>
                  <span className="text-red font-medium flex items-center justify-end gap-1 w-1/3">Monthly Sub</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="w-full py-24 bg-surface-2 border-y border-border">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-normal mb-4 text-text-1">Who Is This For?</h2>
            <p className="text-text-2 text-lg">Auto Clipper is built for everyone who needs clips fast.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-8 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-colors group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">🎥</div>
              <h3 className="font-semibold mb-2 text-text-1 text-lg">Content Creators</h3>
              <p className="text-sm text-text-2">Repurpose long YouTube videos into perfectly sized Shorts, Reels, or TikToks.</p>
            </div>
            <div className="p-8 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-colors group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">🎙️</div>
              <h3 className="font-semibold mb-2 text-text-1 text-lg">Podcasters</h3>
              <p className="text-sm text-text-2">Split long podcast recordings into easily digestible episodic clips.</p>
            </div>
            <div className="p-8 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-colors group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">👩‍🏫</div>
              <h3 className="font-semibold mb-2 text-text-1 text-lg">Teachers</h3>
              <p className="text-sm text-text-2">Divide hour-long lecture recordings into topical chapters for students.</p>
            </div>
            <div className="p-8 bg-surface rounded-2xl border border-border hover:border-accent/50 transition-colors group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left">📱</div>
              <h3 className="font-semibold mb-2 text-text-1 text-lg">Social Managers</h3>
              <p className="text-sm text-text-2">Extract highlights from webinars and company events quickly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full py-24 mb-10">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold tracking-normal mb-12 text-center text-text-1">Frequently Asked Questions</h2>
          <Accordion className="w-full">
            <AccordionItem value="item-1" className="border-border">
              <AccordionTrigger className="text-text-1 hover:text-accent font-medium text-lg">Is it really safe and private?</AccordionTrigger>
              <AccordionContent className="text-text-2 text-base leading-relaxed">
                Yes! Auto Clipper uses WebAssembly and FFmpeg to process your videos directly inside your browser. Your files are never uploaded to our servers, meaning you have 100% privacy and security.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-border">
              <AccordionTrigger className="text-text-1 hover:text-accent font-medium text-lg">What video formats are supported?</AccordionTrigger>
              <AccordionContent className="text-text-2 text-base leading-relaxed">
                We support most major video formats including MP4, WebM, MOV, and AVI, depending on your browser&apos;s capabilities. For the best compatibility, we recommend using MP4.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-border">
              <AccordionTrigger className="text-text-1 hover:text-accent font-medium text-lg">Is there a file size limit?</AccordionTrigger>
              <AccordionContent className="text-text-2 text-base leading-relaxed">
                There is no hard file size limit imposed by us because processing happens on your device. However, your browser&apos;s memory limit and your device&apos;s hardware will dictate how large of a file you can process smoothly.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-border">
              <AccordionTrigger className="text-text-1 hover:text-accent font-medium text-lg">How do I split a video into equal parts?</AccordionTrigger>
              <AccordionContent className="text-text-2 text-base leading-relaxed">
                Just upload your video, set the Segment Length on the right panel to your desired duration, and hit the split button. The tool will automatically calculate the timestamps and divide your video.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
