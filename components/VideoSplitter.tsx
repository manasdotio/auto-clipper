"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import JSZip from "jszip";
import { UploadCloud, FileVideo, Scissors, RefreshCw, Download, Settings, Clock, HardDrive, CheckCircle2, Archive, Smartphone } from "lucide-react";

export default function VideoSplitter() {
  const [loaded, setLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Loading FFmpeg...");
  
  const ffmpegRef = useRef<FFmpeg | null>(null);
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [segmentLengthMinutes, setSegmentLengthMinutes] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>("part");
  
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState(0);
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isReelFormat, setIsReelFormat] = useState(true);
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");

  const segmentLength = segmentLengthMinutes * 60;

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
      }
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.9/dist/umd";
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg Log:", message);
      });
      
      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      });
      
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setLoadingMsg("Failed to load FFmpeg. Check console for details.");
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVideoFile(file);
    setResults([]);
    setProgress(0);
    setCurrentClip(0);
    
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
    };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      alert("Please upload a video file.");
      return;
    }
    
    setVideoFile(file);
    setResults([]);
    setProgress(0);
    setCurrentClip(0);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
    };
  };

  const resetState = () => {
    setVideoFile(null);
    setDuration(0);
    setVideoDimensions({ width: 0, height: 0 });
    setProgress(0);
    setCurrentClip(0);
    setResults([]);
  };

  const handleSplit = async () => {
    if (!videoFile || duration === 0 || !ffmpegRef.current) return;
    
    setProcessing(true);
    const ffmpeg = ffmpegRef.current;
    const numSegments = Math.ceil(duration / segmentLength);
    const newResults: { name: string; url: string }[] = [];
    
    try {
      await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));
      
      if (topText || bottomText) {
        await ffmpeg.writeFile("font.ttf", new Uint8Array(await (await fetch("/Roboto-Regular.ttf")).arrayBuffer()));
      }
      
      for (let i = 0; i < numSegments; i++) {
        const startTime = i * segmentLength;
        const outputName = `${prefix}_${i + 1}.mp4`; // Output extension is mp4 to ensure browser compatibility usually
        setCurrentClip(i + 1);
        setProgress(0);
        
        const args = [
          "-i", videoFile.name,
          "-ss", startTime.toString(),
          "-t", segmentLength.toString(),
        ];
        
        let filters: string[] = [];
        
        if (isReelFormat) {
          let targetW = 1080;
          let targetH = 1920;
          
          if (videoDimensions.width > 0 && videoDimensions.height > 0) {
            // If landscape, swap dimensions for target portrait output
            if (videoDimensions.width > videoDimensions.height) {
              targetW = videoDimensions.height;
              targetH = videoDimensions.width;
            } else {
              targetW = videoDimensions.width;
              targetH = videoDimensions.height;
            }
          }
          
          // Crop to 9:16 aspect ratio (zoom in center), then scale to target resolution
          filters.push(`crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'`);
          filters.push(`scale=${targetW}:${targetH}`);
        }

        if (topText || bottomText) {
          const escapeText = (text: string, clipNum: number) => {
            // Escape special chars for ffmpeg drawtext filter: : ' ,
            let str = text.replace(/{n}/g, clipNum.toString());
            str = str.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/,/g, '\\,');
            return str;
          };
          
          if (topText) {
            const escaped = escapeText(topText, i + 1);
            filters.push(`drawtext=fontfile=font.ttf:text='${escaped}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h/12:borderw=3:bordercolor=black`);
          }
          if (bottomText) {
            const escaped = escapeText(bottomText, i + 1);
            filters.push(`drawtext=fontfile=font.ttf:text='${escaped}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h-(h/12)-text_h:borderw=3:bordercolor=black`);
          }
        }
        
        if (filters.length > 0) {
          args.push("-vf", filters.join(','));
          args.push("-c:v", "libx264");
          args.push("-preset", "ultrafast"); // Fast processing
          args.push("-c:a", "copy"); // Copy audio
        } else {
          args.push("-c", "copy"); // Instant splitting without re-encoding
        }
        
        args.push("-avoid_negative_ts", "1", outputName);
        
        await ffmpeg.exec(args);
        
        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data as any], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        newResults.push({ name: outputName, url });
      }
      
      setResults(newResults);
    } catch (err) {
      console.error("Splitting failed:", err);
      alert("An error occurred during splitting.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleSaveAll = async () => {
    try {
      if (!("showDirectoryPicker" in window)) {
        alert("Your browser does not support the File System Access API. Please download files individually.");
        return;
      }
      setIsSaving(true);
      // @ts-expect-error TypeScript might not know about showDirectoryPicker depending on the lib configuration
      const dirHandle = await window.showDirectoryPicker({
        mode: "readwrite"
      });
      
      for (const res of results) {
        const response = await fetch(res.url);
        const blob = await response.blob();
        
        const fileHandle = await dirHandle.getFileHandle(res.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      }
      alert("All files saved successfully!");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Save all failed:", err);
        alert("Failed to save files. You may need to grant permissions.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      
      for (const res of results) {
        const response = await fetch(res.url);
        const blob = await response.blob();
        zip.file(res.name, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `${prefix}_clips.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP creation failed:", err);
      alert("Failed to create ZIP file.");
    } finally {
      setIsZipping(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const numSegments = Math.ceil(duration / segmentLength);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-600 rounded-2xl mb-2">
          <Scissors className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Auto Clipper</h1>
        <p className="text-slate-500 text-lg">Split your videos into bite-sized clips instantly in your browser. No server uploads.</p>
      </div>

      {!loaded ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-3xl border border-slate-100 shadow-sm">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">{loadingMsg}</p>
        </div>
      ) : (
        <>
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Upload / Info */}
            <div className="space-y-6">
              {!videoFile ? (
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="relative group border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-3xl p-12 transition-all text-center cursor-pointer flex flex-col items-center justify-center h-full min-h-[320px]"
                >
                  <input 
                    type="file" 
                    accept="video/mp4,video/x-m4v,video/*" 
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform mb-4">
                    <UploadCloud className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">Click or drag video here</h3>
                  <p className="text-slate-500 text-sm">Supports MP4, MOV, MKV, WebM</p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileVideo className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 line-clamp-1" title={videoFile.name}>{videoFile.name}</h3>
                        <p className="text-sm text-slate-500">Ready for processing</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Duration</p>
                        <p className="font-medium text-slate-800">{formatTime(duration)}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center space-x-3">
                      <HardDrive className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">File Size</p>
                        <p className="font-medium text-slate-800">{formatSize(videoFile.size)}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={resetState}
                    disabled={processing}
                    className="w-full py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Select Different Video
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Settings */}
            <div className={`space-y-6 transition-opacity duration-300 ${!videoFile ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center space-x-3 text-slate-800 border-b border-slate-100 pb-4">
                  <Settings className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-lg">Split Settings</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-medium text-slate-700">Segment Length (minutes)</label>
                    <input 
                      type="number" 
                      min={0.1} 
                      step={0.1}
                      max={duration > 0 ? Math.ceil(duration / 60) : 10}
                      value={segmentLengthMinutes}
                      onChange={(e) => setSegmentLengthMinutes(Number(e.target.value))}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-center font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <input 
                    type="range" 
                    min={0.1} 
                    step={0.1}
                    max={duration > 0 ? Math.ceil(duration / 60) : 10} 
                    value={segmentLengthMinutes} 
                    onChange={(e) => setSegmentLengthMinutes(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>0.1m</span>
                    <span>{duration > 0 ? (duration / 60).toFixed(1) + 'm' : 'Max'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Output Prefix</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800 placeholder-slate-400"
                      placeholder="e.g. clip"
                    />
                    <div className="absolute inset-y-0 right-4 flex items-center text-slate-400 font-medium text-sm pointer-events-none">
                      _1.mp4
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Reels Format (9:16)</p>
                      <p className="text-xs text-slate-500">Crop and zoom video for Shorts/Reels</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isReelFormat}
                      onChange={(e) => setIsReelFormat(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="space-y-4 pt-3 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                      <span>Top Text Overlay</span>
                      <span className="text-xs font-normal text-slate-400">Use {'{n}'} for part #</span>
                    </label>
                    <input 
                      type="text" 
                      value={topText}
                      onChange={(e) => setTopText(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                      placeholder="e.g. Part {n}"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Bottom Text Overlay</label>
                    <input 
                      type="text" 
                      value={bottomText}
                      onChange={(e) => setBottomText(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                      placeholder="e.g. Follow for more!"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="flex justify-between items-center px-4 py-3 bg-blue-50 rounded-xl text-blue-800">
                    <span className="font-medium">Expected Output</span>
                    <span className="font-bold">{numSegments || 0} clips</span>
                  </div>

                  {!processing ? (
                    <button 
                      onClick={handleSplit}
                      disabled={!videoFile || processing}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2"
                    >
                      <Scissors className="w-5 h-5" />
                      <span>Split Video</span>
                    </button>
                  ) : (
                    <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex justify-between text-sm font-medium mb-2">
                        <span className="text-blue-600">Processing clip {currentClip} of {numSegments}</span>
                        <span className="text-slate-500">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Results Grid / Live Preview Grid */}
          {(videoFile && duration > 0) && (
            <div className="mt-12 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-xl font-bold text-slate-800 flex items-center space-x-2">
                  {results.length > 0 ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span>Your Clips ({results.length})</span>
                    </>
                  ) : (
                    <span>Live Preview Schedule</span>
                  )}
                </h3>
                {results.length > 0 && (
                  <div className="flex items-center space-x-3 flex-wrap gap-y-2">
                    <button
                      onClick={handleDownloadZip}
                      disabled={isZipping}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center space-x-2"
                    >
                      <Archive className="w-4 h-4" />
                      <span>{isZipping ? "Zipping..." : "Download ZIP"}</span>
                    </button>
                    {typeof window !== "undefined" && "showDirectoryPicker" in window && (
                      <button
                        onClick={handleSaveAll}
                        disabled={isSaving}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-md transition-colors disabled:opacity-50 flex items-center space-x-2"
                      >
                        <HardDrive className="w-4 h-4" />
                        <span>{isSaving ? "Saving..." : "Save All to Folder"}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.length > 0 ? (
                  results.map((res, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-colors">
                      <div className="mb-4">
                        <h4 className="font-medium text-slate-800 truncate" title={res.name}>{res.name}</h4>
                        <p className="text-xs text-slate-500">
                          {formatTime(i * segmentLength)} - {formatTime(Math.min((i + 1) * segmentLength, duration))}
                        </p>
                      </div>
                      <a 
                        href={res.url} 
                        download={res.name}
                        className="flex items-center justify-center space-x-2 w-full py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))
                ) : (
                  Array.from({ length: numSegments }).map((_, i) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-center items-center h-28 opacity-70">
                      <span className="font-semibold text-slate-700">{prefix}_{i + 1}.mp4</span>
                      <span className="text-sm text-slate-500 mt-1">
                        {formatTime(i * segmentLength)} - {formatTime(Math.min((i + 1) * segmentLength, duration))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
