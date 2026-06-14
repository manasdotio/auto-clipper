"use client";

import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import JSZip from "jszip";
import { 
  UploadCloud, 
  FileVideo, 
  Scissors, 
  RefreshCw, 
  Download, 
  Settings, 
  Clock, 
  HardDrive, 
  CheckCircle2, 
  Archive, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Type,
  Music,
  Info,
  Volume2,
  Image as ImageIcon
} from "lucide-react";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export default function VideoSplitter() {
  const [loaded, setLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Loading FFmpeg...");
  
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<string[]>([]);
  
  // Primary Video State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [bgVideoDimensions, setBgVideoDimensions] = useState({ width: 0, height: 0 });
  const [segmentLengthMinutes, setSegmentLengthMinutes] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>("part");
  
  // New Aspect Ratio & Framing State
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "original">("9:16");
  const [framingMode, setFramingMode] = useState<"crop" | "letterbox" | "blur">("crop");
  const [isReelFormat, setIsReelFormat] = useState(true);
  const [exportResolution, setExportResolution] = useState<"360p" | "480p" | "720p">("480p");
  
  // New SRT Subtitle State
  const [srtFile, setSrtFile] = useState<File | null>(null);
  const [subtitlesList, setSubtitlesList] = useState<Subtitle[]>([]);
  
  // New Watermark State
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<"topLeft" | "topRight" | "bottomLeft" | "bottomRight">("topRight");

  // Custom Overlays State
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);

  // Draggable overlay positions (percentages)
  const [topTextY, setTopTextY] = useState<number>(12);
  const [bottomTextY, setBottomTextY] = useState<number>(85);
  const [watermarkX, setWatermarkX] = useState<number>(85);
  const [watermarkY, setWatermarkY] = useState<number>(10);

  // Collapsible Settings sections
  const [openSection, setOpenSection] = useState<string>("basic");

  // Viral Boost Features State
  const [isGenZSplit, setIsGenZSplit] = useState(false);
  const [bgVideoFile, setBgVideoFile] = useState<File | null>(null);
  const [bgVideoSrc, setBgVideoSrc] = useState<string>("");
  
  const [isHookEnabled, setIsHookEnabled] = useState(false);
  const [hookFiles, setHookFiles] = useState<File[]>([]);
  const [hookDurations, setHookDurations] = useState<Record<string, number>>({});
  
  const [isBgAudioEnabled, setIsBgAudioEnabled] = useState(false);
  const [bgAudioFile, setBgAudioFile] = useState<File | null>(null);
  const [bgmVolume, setBgmVolume] = useState<number>(0.10);
  
  const [bypassCopyright, setBypassCopyright] = useState(false);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [useSceneCut, setUseSceneCut] = useState<boolean>(false);

  // Processing State
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState(0);
  const [totalClips, setTotalClips] = useState(0);
  const [statusDetail, setStatusDetail] = useState("");
  const [results, setResults] = useState<{ name: string; url: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [ffmpegLogs, setFfmpegLogs] = useState<string[]>([]);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [previewTime, setPreviewTime] = useState<number>(0);

  const segmentLength = segmentLengthMinutes * 60;

  const loadFFmpeg = async () => {
    try {
      if (!ffmpegRef.current) {
        ffmpegRef.current = new FFmpeg();
      }
      const baseURL = "https://unpkg.com/@ffmpeg/core-mt@0.12.9/dist/umd";
      const ffmpeg = ffmpegRef.current;
      
      ffmpeg.on("log", ({ message }) => {
        console.log("FFmpeg Log:", message);
        logsRef.current.push(message);
        if (logsRef.current.length > 200) {
          logsRef.current.shift();
        }
        setFfmpegLogs([...logsRef.current]);
      });
      
      ffmpeg.on("progress", ({ progress }) => {
        setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
      });

      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript"),
      });
      
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setLoadingMsg("Failed to load FFmpeg. Check console for details.");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadFFmpeg();
  }, []);

  // Update object URL for preview when primary video changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVideoSrc(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoSrc("");
    }
  }, [videoFile]);

  // Update object URL for preview and capture dimensions when background video changes
  useEffect(() => {
    if (bgVideoFile) {
      const url = URL.createObjectURL(bgVideoFile);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBgVideoSrc(url);
      
      const video = document.createElement("video");
      video.src = url;
      video.onloadedmetadata = () => {
        setBgVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      };
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBgVideoSrc("");
      setBgVideoDimensions({ width: 0, height: 0 });
    }
  }, [bgVideoFile]);

  // Clean up object URLs when results change or component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      results.forEach((res) => {
        if (res.url) {
          URL.revokeObjectURL(res.url);
        }
      });
    };
  }, [results]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setVideoFile(file);
    setResults([]);
    setProgress(0);
    setCurrentClip(0);
    setStartOffset(0);
    
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
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
    setStartOffset(0);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    };
  };

  // Helper to get video duration for hooks
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        resolve(video.duration);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => {
        resolve(0);
        URL.revokeObjectURL(video.src);
      };
    });
  };

  const handleHookFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    setHookFiles((prev) => [...prev, ...newFiles]);
    for (const file of newFiles) {
      const dur = await getVideoDuration(file);
      setHookDurations((prev) => ({ ...prev, [file.name]: dur }));
    }
  };

  const handleRemoveHook = (idx: number) => {
    setHookFiles((prev) => {
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const formatSRTTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  const convertChunksToSRT = (chunks: Array<{ timestamp: [number, number]; text: string }>): string => {
    return chunks
      .map((chunk, index) => {
        const startSec = chunk.timestamp[0] ?? 0;
        const endSec = chunk.timestamp[1] ?? (startSec + 2);
        const text = chunk.text.trim();
        return `${index + 1}\n${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n${text}`;
      })
      .join("\n\n");
  };

  const resampleAudioBufferTo16kMono = async (audioBuffer: AudioBuffer): Promise<Float32Array> => {
    const targetSampleRate = 16000;
    const duration = audioBuffer.duration;
    const length = Math.floor(duration * targetSampleRate);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const OfflineContext = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    if (!OfflineContext) {
      throw new Error("OfflineAudioContext is not supported.");
    }
    const offlineCtx = new OfflineContext(1, length, targetSampleRate);
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    
    const renderedBuffer = await offlineCtx.startRendering();
    return renderedBuffer.getChannelData(0);
  };

  const generateCaptions = async () => {
    if (!videoFile) return;

    setIsTranscribing(true);
    setTranscriptionProgress(0);
    setTranscriptionStatus("Extracting audio from video...");

    let audioData: Float32Array | null = null;
    let nativeSuccessful = false;

    // 1. Try to extract and decode audio track natively in the browser first (uses very little memory and is extremely fast)
    try {
      setTranscriptionStatus("Reading file natively...");
      let arrayBuffer: ArrayBuffer | null = await videoFile.arrayBuffer();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error("Web Audio API is not supported in this browser.");
      }

      setTranscriptionStatus("Decoding audio natively...");
      const audioCtx = new AudioContextClass();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      arrayBuffer = null; // Free up the raw file buffer memory instantly!

      setTranscriptionStatus("Resampling audio natively...");
      audioData = await resampleAudioBufferTo16kMono(audioBuffer);
      await audioCtx.close();
      nativeSuccessful = true;
      console.log("Native audio decoding and resampling succeeded.");
    } catch (nativeErr) {
      console.warn("Native audio decoding failed, falling back to FFmpeg:", nativeErr);
    }

    // 2. Fall back to FFmpeg WASM if native decoding fails
    if (!nativeSuccessful) {
      try {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg) {
          throw new Error("FFmpeg is not loaded yet.");
        }

        setTranscriptionStatus("Writing video to workspace (FFmpeg fallback)...");
        await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));

        setTranscriptionStatus("Extracting & resampling audio (FFmpeg fallback)...");
        await ffmpeg.exec([
          "-i", videoFile.name,
          "-vn",
          "-acodec", "pcm_s16le",
          "-ar", "16000",
          "-ac", "1",
          "audio.wav"
        ]);

        setTranscriptionStatus("Loading audio data (FFmpeg fallback)...");
        const wavData = await ffmpeg.readFile("audio.wav") as Uint8Array;

        // Clean up virtual FS immediately
        await ffmpeg.deleteFile("audio.wav").catch(() => {});
        await ffmpeg.deleteFile(videoFile.name).catch(() => {});

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        setTranscriptionStatus("Decoding audio data (FFmpeg fallback)...");

        const audioBufferCopy = new ArrayBuffer(wavData.byteLength);
        new Uint8Array(audioBufferCopy).set(wavData);

        const audioBuffer = await audioCtx.decodeAudioData(audioBufferCopy);
        audioData = audioBuffer.getChannelData(0);
        await audioCtx.close();
      } catch (err: any) {
        if (ffmpegRef.current) {
          await ffmpegRef.current.deleteFile(videoFile.name).catch(() => {});
          await ffmpegRef.current.deleteFile("audio.wav").catch(() => {});
        }
        console.error("FFmpeg fallback transcription failed:", err);
        setIsTranscribing(false);
        setTranscriptionStatus("");
        alert(`Failed to generate subtitles: ${err.message || String(err)}`);
        return;
      }
    }

    if (!audioData) {
      setIsTranscribing(false);
      setTranscriptionStatus("");
      alert("Failed to decode audio data.");
      return;
    }

    // 3. Run speech recognition with the worker
    try {
      setTranscriptionStatus("Loading Whisper AI model...");

      // Instantiate Web Worker from the static public path with cache busting to force reloading edits
      // eslint-disable-next-line react-hooks/purity
      const worker = new Worker(`/whisper.worker.js?v=${Date.now()}`, {
        type: "module",
      });

      worker.onerror = (err) => {
        console.error("Worker load/execution error:", err);
        setIsTranscribing(false);
        setTranscriptionStatus("");
        alert("Failed to load transcription worker. Please verify browser console logs for details.");
        worker.terminate();
      };

      worker.onmessage = (event) => {
        const { status, progress, message, result, error } = event.data;

        if (status === "loading") {
          setTranscriptionStatus(message);
        } else if (status === "progress") {
          setTranscriptionProgress(progress);
          setTranscriptionStatus(`Downloading AI Model... ${Math.round(progress)}%`);
        } else if (status === "transcribing") {
          setTranscriptionStatus("Transcribing audio (running locally on your device)...");
          setTranscriptionProgress(0);
        } else if (status === "completed") {
          setIsTranscribing(false);
          setTranscriptionStatus("");

          if (result && result.chunks) {
            const srtContent = convertChunksToSRT(result.chunks);
            const newSrtFile = new File([srtContent], `${videoFile.name.split(".")[0]}.srt`, {
              type: "text/plain",
            });

            setSrtFile(newSrtFile);
            const parsed = parseSRT(srtContent);
            setSubtitlesList(parsed);
            alert("Subtitles generated successfully!");
          } else {
            alert("No speech was detected or transcription was empty.");
          }
          worker.terminate();
        } else if (status === "error") {
          setIsTranscribing(false);
          setTranscriptionStatus("");
          alert(`Failed to transcribe: ${error}`);
          worker.terminate();
        }
      };

      worker.postMessage({ audio: audioData }, [audioData.buffer]);
    } catch (err: any) {
      console.error("Transcription pipeline execution failed:", err);
      setIsTranscribing(false);
      setTranscriptionStatus("");
      alert(`Failed to generate subtitles: ${err.message || String(err)}`);
    }
  };

  // SRT Subtitle Parser
  const parseSRT = (content: string): Subtitle[] => {
    const subs: Subtitle[] = [];
    const blocks = content.trim().split(/\n\s*\n/);
    
    const parseTime = (timeStr: string): number => {
      const [time, ms] = timeStr.trim().split(',');
      const [h, m, s] = time.split(':').map(Number);
      return h * 3600 + m * 60 + s + Number(ms) / 1000;
    };

    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        if (timeLine.includes('-->')) {
          const [startStr, endStr] = timeLine.split('-->');
          try {
            const start = parseTime(startStr);
            const end = parseTime(endStr);
            const text = lines.slice(2).join(' ').replace(/\r/g, '').trim();
            subs.push({ start, end, text });
          } catch (e) {
            console.error("Failed to parse time block:", block);
          }
        }
      }
    }
    return subs;
  };

  const handleSrtChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSrtFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseSRT(content);
      setSubtitlesList(parsed);
    };
    reader.readAsText(file);
  };

  const applyPreset = (preset: "tiktok" | "shorts" | "fb_li") => {
    if (preset === "tiktok") {
      setAspectRatio("9:16");
      setFramingMode("crop");
      setSegmentLengthMinutes(1.0);
      setIsReelFormat(true);
    } else if (preset === "shorts") {
      setAspectRatio("9:16");
      setFramingMode("crop");
      setSegmentLengthMinutes(0.983);
      setIsReelFormat(true);
    } else if (preset === "fb_li") {
      setAspectRatio("4:5");
      setFramingMode("crop");
      setSegmentLengthMinutes(1.0);
      setIsReelFormat(true);
    }
    setOpenSection("basic");
  };

  const resetState = () => {
    setVideoFile(null);
    setBgVideoFile(null);
    setBgAudioFile(null);
    setWatermarkFile(null);
    setSrtFile(null);
    setSubtitlesList([]);
    setHookFiles([]);
    setHookDurations({});
    setDuration(0);
    setVideoDimensions({ width: 0, height: 0 });
    setProgress(0);
    setCurrentClip(0);
    setStartOffset(0);
    setResults([]);
  };

  // Check if a video has audio track
  const checkAudioTrack = async (ffmpeg: FFmpeg, filename: string): Promise<boolean> => {
    let hasAudio = false;
    const logHandler = ({ message }: { message: string }) => {
      if (/Stream #\d+:\d+.*Audio:/i.test(message)) {
        hasAudio = true;
      }
    };
    ffmpeg.on("log", logHandler);
    try {
      // Use a valid null output with short duration so FFmpeg completes successfully with exit code 0
      // This prevents the WebAssembly instance from aborting and entering a corrupted state.
      await ffmpeg.exec(["-t", "0.1", "-i", filename, "-c", "copy", "-f", "null", "null"]);
    } catch (e) {
      console.warn("Audio track check warning:", e);
    } finally {
      ffmpeg.off("log", logHandler);
    }
    return hasAudio;
  };

  const resizeImageToBlob = (file: File, targetWidth: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas 2D context"));
            return;
          }
          const scaleFactor = targetWidth / img.width;
          const targetHeight = Math.round(img.height * scaleFactor);
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Canvas toBlob returned null"));
            }
          }, "image/png");
        };
        img.onerror = () => {
          reject(new Error("Failed to load image element"));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSplit = async () => {
    if (!videoFile || duration === 0 || !ffmpegRef.current) return;
    
    logsRef.current = [];
    setFfmpegLogs([]);
    setProcessing(true);
    setStatusDetail("Preparing workspace...");
    const ffmpeg = ffmpegRef.current;
    
    try {
      console.log("Starting split process. Writing main video file:", videoFile.name);
      // 1. Write the main video file
      try {
        await ffmpeg.writeFile(videoFile.name, await fetchFile(videoFile));
        console.log("Main video file written to virtual filesystem successfully.");
      } catch (writeErr) {
        console.error("Failed to write main video file to virtual filesystem:", writeErr);
        throw new Error(`Failed to upload main video: ${writeErr instanceof Error ? writeErr.message : writeErr}`);
      }
      
      // Write font if subtitles or text overlays are active
      if (topText || bottomText || subtitlesList.length > 0) {
        console.log("Writing font.ttf to virtual filesystem...");
        try {
          await ffmpeg.writeFile("font.ttf", new Uint8Array(await (await fetch("/Roboto-Regular.ttf")).arrayBuffer()));
          console.log("font.ttf written successfully.");
        } catch (fontErr) {
          console.error("Failed to write font.ttf:", fontErr);
        }
      }

      // Check primary video audio
      console.log("Checking audio track of primary video...");
      const primaryHasAudio = await checkAudioTrack(ffmpeg, videoFile.name);
      console.log("Primary video has audio track:", primaryHasAudio);

      // Check and write background video
      let bgVideoHasAudio = false;
      if (isGenZSplit && bgVideoFile) {
        console.log("Writing background video file:", bgVideoFile.name);
        try {
          await ffmpeg.writeFile(bgVideoFile.name, await fetchFile(bgVideoFile));
          bgVideoHasAudio = await checkAudioTrack(ffmpeg, bgVideoFile.name);
          console.log("Background video written and checked. Has audio:", bgVideoHasAudio);
        } catch (bgErr) {
          console.error("Failed to write background video:", bgErr);
          throw new Error(`Failed to upload background video: ${bgErr instanceof Error ? bgErr.message : bgErr}`);
        }
      }

      // Check hooks audio track
      const hookAudioStatus: Record<string, boolean> = {};
      if (isHookEnabled && hookFiles.length > 0) {
        console.log("Writing hook files and checking audio...");
        for (const hook of hookFiles) {
          try {
            await ffmpeg.writeFile(hook.name, await fetchFile(hook));
            hookAudioStatus[hook.name] = await checkAudioTrack(ffmpeg, hook.name);
            console.log(`Hook ${hook.name} written and checked. Has audio:`, hookAudioStatus[hook.name]);
          } catch (hookErr) {
            console.error(`Failed to write hook ${hook.name}:`, hookErr);
            throw new Error(`Failed to upload hook ${hook.name}: ${hookErr instanceof Error ? hookErr.message : hookErr}`);
          }
        }
      }

      // Write background audio file if present
      if (isBgAudioEnabled && bgAudioFile) {
        console.log("Writing background audio file:", bgAudioFile.name);
        try {
          await ffmpeg.writeFile(bgAudioFile.name, await fetchFile(bgAudioFile));
          console.log("Background audio file written successfully.");
        } catch (bgAudioErr) {
          console.error("Failed to write background audio:", bgAudioErr);
          throw new Error(`Failed to upload background music: ${bgAudioErr instanceof Error ? bgAudioErr.message : bgAudioErr}`);
        }
      }

      // Write watermark if present (resizing it in Javascript to prevent WebAssembly memory/scaling hangs)
      if (watermarkFile) {
        console.log("Resizing and writing watermark image...");
        try {
          const maxW = exportResolution === "360p" ? 360 : exportResolution === "480p" ? 480 : 720;
          let targetW = maxW;
          if (aspectRatio === "original" && videoDimensions.width > 0) {
            targetW = videoDimensions.width;
          } else if (videoDimensions.width > 0 && videoDimensions.height > 0) {
            if (videoDimensions.width > videoDimensions.height) {
              targetW = Math.min(videoDimensions.height, maxW);
            } else {
              targetW = Math.min(videoDimensions.width, maxW);
            }
          }
          if (targetW % 2 !== 0) targetW--;
          const wmWidth = Math.round(targetW * 0.18);

          const resizedBlob = await resizeImageToBlob(watermarkFile, wmWidth);
          await ffmpeg.writeFile("watermark.png", await fetchFile(resizedBlob));
          console.log("Watermark image written successfully. Target width:", wmWidth);
        } catch (wmErr) {
          console.error("Failed to write watermark:", wmErr);
          throw new Error(`Failed to upload watermark: ${wmErr instanceof Error ? wmErr.message : wmErr}`);
        }
      }

      // 2. Pre-calculate split timings (with scene cuts if toggled)
      const segmentStarts: number[] = [startOffset];
      const effectiveDuration = duration - startOffset;
      const nominalSegments = Math.ceil(effectiveDuration / segmentLength);
      
      setStatusDetail("Mapping segment transition cuts...");
      
      for (let i = 1; i < nominalSegments; i++) {
        const nominalStart = startOffset + i * segmentLength;
        if (nominalStart >= duration) break;
        
        if (useSceneCut) {
          setStatusDetail(`Analyzing transitions around part ${i} boundary...`);
          const seekStart = Math.max(0, nominalStart - 5);
          let detectedOffset = -1;
          
          const logHandler = ({ message }: { message: string }) => {
            if (message.includes("showinfo") && message.includes("pts_time:")) {
              const match = message.match(/pts_time:([0-9.]+)/);
              if (match && detectedOffset === -1) {
                detectedOffset = Number(match[1]);
              }
            }
          };
          
          ffmpeg.on("log", logHandler);
          try {
            await ffmpeg.exec([
              "-ss", seekStart.toString(),
              "-t", "10",
              "-i", videoFile.name,
              "-an",
              "-sn",
              "-vf", "scale=160:-2,select='gt(scene,0.3)',showinfo",
              "-f", "null",
              "null"
            ]);
          } catch (e) {
            // Ignore
          } finally {
            ffmpeg.off("log", logHandler);
          }
          
          if (detectedOffset !== -1) {
            const sceneTime = seekStart + detectedOffset;
            segmentStarts.push(sceneTime);
          } else {
            segmentStarts.push(nominalStart);
          }
        } else {
          segmentStarts.push(nominalStart);
        }
      }
      segmentStarts.push(duration); // End boundary
      const numSegments = segmentStarts.length - 1;
      setTotalClips(numSegments);
      
      const newResults: { name: string; url: string }[] = [];

      // 3. Process each segment
      for (let i = 0; i < numSegments; i++) {
        const startTime = segmentStarts[i];
        const endTime = segmentStarts[i + 1];
        const currentSegmentLength = endTime - startTime;
        
        const outputName = `${prefix}_${i + 1}.mp4`;
        setCurrentClip(i + 1);
        setProgress(0);
        setStatusDetail(`Splitting segment ${i + 1}...`);

        // Pick a random hook if enabled
        let selectedHook: File | null = null;
        if (isHookEnabled && hookFiles.length > 0) {
          selectedHook = hookFiles[Math.floor(Math.random() * hookFiles.length)];
        }

        const hookDuration = selectedHook ? (hookDurations[selectedHook.name] || 2) : 0;
        
        // Check if we need advanced composition
        const needsEncoding = isReelFormat || topText || bottomText || (isGenZSplit && bgVideoFile) || (isBgAudioEnabled && bgAudioFile) || selectedHook || bypassCopyright || watermarkFile || subtitlesList.length > 0;

        const args: string[] = [];

        if (!needsEncoding) {
          // Instant stream copy
          args.push(
            "-i", videoFile.name,
            "-ss", startTime.toString(),
            "-t", currentSegmentLength.toString(),
            "-c", "copy",
            "-avoid_negative_ts", "1",
            outputName
          );
        } else {
          // Advanced composition using filter_complex
          let inputIdx = 0;
          let hookIdx = -1;
          
          if (selectedHook) {
            args.push("-i", selectedHook.name);
            hookIdx = inputIdx++;
          }

          // Main video segment input
          args.push("-ss", startTime.toString(), "-t", currentSegmentLength.toString(), "-i", videoFile.name);
          const primaryIdx = inputIdx++;

          let bgIdx = -1;
          if (isGenZSplit && bgVideoFile) {
            args.push("-stream_loop", "-1", "-i", bgVideoFile.name);
            bgIdx = inputIdx++;
          }

          let bgAudioIdx = -1;
          if (isBgAudioEnabled && bgAudioFile) {
            args.push("-stream_loop", "-1", "-i", bgAudioFile.name);
            bgAudioIdx = inputIdx++;
          }

          let watermarkIdx = -1;
          if (watermarkFile) {
            args.push("-loop", "1", "-i", "watermark.png");
            watermarkIdx = inputIdx++;
          }

          // Dimensions (ensuring divisibility by 2)
          const maxW = exportResolution === "360p" ? 360 : exportResolution === "480p" ? 480 : 720;
          let targetW = maxW;
          let targetH = aspectRatio === "4:5" ? Math.round(maxW * 5 / 4) : Math.round(maxW * 16 / 9);
          
          if (aspectRatio === "original" && videoDimensions.width > 0) {
            targetW = videoDimensions.width;
            targetH = videoDimensions.height;
          } else if (videoDimensions.width > 0 && videoDimensions.height > 0) {
            // Cap the target width based on exportResolution to prevent WebAssembly memory crashes
            if (videoDimensions.width > videoDimensions.height) {
              targetW = Math.min(videoDimensions.height, maxW);
            } else {
              targetW = Math.min(videoDimensions.width, maxW);
            }
            if (targetW % 2 !== 0) targetW--;
            
            if (aspectRatio === "4:5") {
              targetH = Math.round(targetW * 5 / 4);
            } else {
              targetH = Math.round(targetW * 16 / 9);
            }
          } else {
            // Fallback if dimensions are unavailable
            if (aspectRatio === "4:5") {
              targetW = maxW;
              targetH = Math.round(maxW * 5 / 4);
            } else {
              targetW = maxW;
              targetH = Math.round(maxW * 16 / 9);
            }
          }
          
          if (targetW % 2 !== 0) targetW--;
          if (targetH % 2 !== 0) targetH--;

          // Pre-calculate crop dimensions in Javascript to avoid FFmpeg syntax and parsing errors with commas/parentheses
          const isAspectActive = aspectRatio !== "original";
          const primaryW = videoDimensions.width > 0 ? videoDimensions.width : 1280;
          const primaryH = videoDimensions.height > 0 ? videoDimensions.height : 720;
          
          let primaryCropW = primaryW;
          let primaryCropH = primaryH;
          
          if (isGenZSplit && bgVideoFile) {
            const aspect = targetW / (targetH / 2);
            if (primaryW / primaryH > aspect) {
              primaryCropW = Math.round(primaryH * aspect);
              primaryCropH = primaryH;
            } else {
              primaryCropW = primaryW;
              primaryCropH = Math.round(primaryW / aspect);
            }
          } else if (isAspectActive) {
            const aspect = aspectRatio === "4:5" ? 4 / 5 : 9 / 16;
            if (primaryW / primaryH > aspect) {
              primaryCropW = Math.round(primaryH * aspect);
              primaryCropH = primaryH;
            } else {
              primaryCropW = primaryW;
              primaryCropH = Math.round(primaryW / aspect);
            }
          }
          if (primaryCropW % 2 !== 0) primaryCropW--;
          if (primaryCropH % 2 !== 0) primaryCropH--;

          // Apply anti-copyright scale multipliers if enabled
          const finalPrimaryCropW = bypassCopyright ? Math.round(primaryCropW * 0.985) : primaryCropW;
          const finalPrimaryCropH = bypassCopyright ? Math.round(primaryCropH * 0.985) : primaryCropH;
          const safePrimaryCropW = finalPrimaryCropW % 2 === 0 ? finalPrimaryCropW : finalPrimaryCropW - 1;
          const safePrimaryCropH = finalPrimaryCropH % 2 === 0 ? finalPrimaryCropH : finalPrimaryCropH - 1;

          // Pre-calculate background crop sizes (for GenZ Split)
          let bgCropW = 1280;
          let bgCropH = 720;
          if (isGenZSplit && bgVideoFile) {
            const bgW = bgVideoDimensions.width > 0 ? bgVideoDimensions.width : 1280;
            const bgH = bgVideoDimensions.height > 0 ? bgVideoDimensions.height : 720;
            const aspect = 9 / 8;
            if (bgW / bgH > aspect) {
              bgCropW = Math.round(bgH * aspect);
              bgCropH = bgH;
            } else {
              bgCropW = bgW;
              bgCropH = Math.round(bgW / aspect);
            }
            if (bgCropW % 2 !== 0) bgCropW--;
            if (bgCropH % 2 !== 0) bgCropH--;
          }

          // Pre-calculate hook crop sizes
          let hookCropW = 1280;
          let hookCropH = 720;
          if (hookIdx !== -1 && selectedHook) {
            const hookW = 1280; // Default standard assumption
            const hookH = 720;
            const aspect = aspectRatio === "4:5" ? 4 / 5 : 9 / 16;
            if (hookW / hookH > aspect) {
              hookCropW = Math.round(hookH * aspect);
              hookCropH = hookH;
            } else {
              hookCropW = hookW;
              hookCropH = Math.round(hookW / aspect);
            }
            if (hookCropW % 2 !== 0) hookCropW--;
            if (hookCropH % 2 !== 0) hookCropH--;
          }

          // Anti-Copyright randomized offsets
          const speed = (1.01 + Math.random() * 0.02).toFixed(4);
          const hueShift = (Math.random() * 4 - 2).toFixed(2);
          const satShift = (0.99 + Math.random() * 0.02).toFixed(4);

          // Build filter graph parts
          const filterParts: string[] = [];

          // Hook processing
          if (hookIdx !== -1 && selectedHook) {
            filterParts.push(`[${hookIdx}:v]crop=${hookCropW}:${hookCropH},scale=${targetW}:${targetH}[hook_v]`);
            if (hookAudioStatus[selectedHook.name]) {
              filterParts.push(`[${hookIdx}:a]volume=1[hook_a]`);
            } else {
              filterParts.push(`anullsrc=r=44100:cl=stereo:d=${hookDuration}[hook_a]`);
            }
          }

          // Primary video composition with chosen Framing Mode
          if (isAspectActive || (isGenZSplit && bgVideoFile)) {
            if (isGenZSplit && bgVideoFile) {
              let primVF = `[${primaryIdx}:v]crop=${safePrimaryCropW}:${safePrimaryCropH},scale=${targetW}:${targetH / 2}`;
              if (bypassCopyright) {
                primVF += `,hue=h=${hueShift}:s=${satShift},setpts=PTS/${speed}`;
              }
              filterParts.push(`${primVF}[primary_v]`);
            } else {
              let primVF = "";
              if (framingMode === "crop") {
                primVF = `[${primaryIdx}:v]crop=${safePrimaryCropW}:${safePrimaryCropH},scale=${targetW}:${targetH}`;
              } else if (framingMode === "letterbox") {
                const zoomCrop = bypassCopyright ? "crop=0.985*iw:0.985*ih," : "";
                primVF = `[${primaryIdx}:v]${zoomCrop}scale=${targetW}:-2,pad=${targetW}:${targetH}:0:(oh-ih)/2:black`;
              } else {
                const zoomCrop = bypassCopyright ? "crop=0.985*iw:0.985*ih," : "";
                filterParts.push(`[${primaryIdx}:v]${zoomCrop}split=2[v_bg][v_fg]`);
                filterParts.push(`[v_bg]crop=${primaryCropW}:${primaryCropH},scale=${targetW}:${targetH},boxblur=20:2[bg_blur]`);
                filterParts.push(`[v_fg]scale=${targetW}:-2[fg_scaled]`);
                primVF = `[bg_blur][fg_scaled]overlay=0:(H-h)/2`;
              }
              
              if (bypassCopyright) {
                primVF += `,hue=h=${hueShift}:s=${satShift},setpts=PTS/${speed}`;
              }
              filterParts.push(`${primVF}[primary_v]`);
            }
          } else {
            let primVF = `[${primaryIdx}:v]`;
            if (bypassCopyright) {
              primVF += `crop=0.985*iw:0.985*ih,hue=h=${hueShift}:s=${satShift},setpts=PTS/${speed}`;
            } else {
              primVF += `null`;
            }
            filterParts.push(`${primVF}[primary_v]`);
          }

          // Primary audio bypass & silence generator
          if (primaryHasAudio) {
            let primAF = `[${primaryIdx}:a]`;
            if (bypassCopyright) {
              primAF += `atempo=${speed}`;
            } else {
              primAF += `anull`;
            }
            filterParts.push(`${primAF}[primary_a]`);
          } else {
            filterParts.push(`anullsrc=r=44100:cl=stereo:d=${currentSegmentLength}[primary_a]`);
          }

          // Background Video stack
          if (isGenZSplit && bgVideoFile && bgIdx !== -1) {
            filterParts.push(`[${bgIdx}:v]crop=${bgCropW}:${bgCropH},scale=${targetW}:${targetH / 2}[bg_v]`);
            filterParts.push(`[primary_v][bg_v]vstack=inputs=2:shortest=1[main_v]`);
          } else {
            filterParts.push(`[primary_v]null[main_v]`);
          }

          // Background Music overlay
          if (isBgAudioEnabled && bgAudioFile && bgAudioIdx !== -1) {
            filterParts.push(`[${bgAudioIdx}:a]volume=${bgmVolume}[bgm_a]`);
            filterParts.push(`[primary_a][bgm_a]amix=inputs=2:duration=first[main_a]`);
          } else {
            filterParts.push(`[primary_a]anull[main_a]`);
          }

          // Append Hook if enabled
          if (hookIdx !== -1) {
            filterParts.push(`[hook_v][hook_a][main_v][main_a]concat=n=2:v=1:a=1[pre_composed_v][concat_a]`);
          } else {
            filterParts.push(`[main_v]null[pre_composed_v]`);
          }

          // Watermark overlay
          let watermarkedStream = "[pre_composed_v]";
          if (watermarkIdx !== -1) {
            // Map percentage coordinates to output resolution
            const overlayX = `main_w*${watermarkX / 100}-overlay_w/2`;
            const overlayY = `main_h*${watermarkY / 100}-overlay_h/2`;
            
            // The watermark is already resized to its final dimensions in JS, so overlay it directly!
            filterParts.push(`[pre_composed_v][${watermarkIdx}:v]overlay=${overlayX}:${overlayY}:shortest=1[wm_v]`);
            watermarkedStream = "[wm_v]";
          }

          // Dynamic SRT subtitles burning
          let subtitledStream = watermarkedStream;
          const segmentSubs = subtitlesList.filter(sub => sub.start < endTime && sub.end > startTime);
          
          if (segmentSubs.length > 0) {
            let srtVF = watermarkedStream;
            const escapeText = (text: string) => {
              return text.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/,/g, '\\,');
            };
            
            for (let j = 0; j < segmentSubs.length; j++) {
              const sub = segmentSubs[j];
              const startInClip = Math.max(0, sub.start - startTime) + hookDuration;
              const endInClip = Math.min(currentSegmentLength, sub.end - startTime) + hookDuration;
              const escaped = escapeText(sub.text.replace(/\n/g, ' '));
              
              // No comma for the very first filter in the chain after the input label
              const separator = (j === 0 && srtVF.startsWith("[")) ? "" : ",";
              srtVF += `${separator}drawtext=fontfile=font.ttf:text='${escaped}':fontcolor=white:fontsize=h/22:x=(w-text_w)/2:y=h*0.75:borderw=3:bordercolor=black:enable='between(t,${startInClip.toFixed(2)},${endInClip.toFixed(2)})'`;
            }
            filterParts.push(`${srtVF}[subbed_v]`);
            subtitledStream = "[subbed_v]";
          }

          // Static top and bottom overlays
          let finalVideoLabel = subtitledStream;
          if (topText || bottomText) {
            let textVF = `${subtitledStream}`;
            const escapeText = (text: string, clipNum: number) => {
              const str = text.replace(/{n}/g, clipNum.toString());
              return str.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/,/g, '\\,');
            };
            
            let isFirst = true;
            if (topText) {
              const escaped = escapeText(topText, i + 1);
              const separator = (isFirst && textVF.startsWith("[")) ? "" : ",";
              textVF += `${separator}drawtext=fontfile=font.ttf:text='${escaped}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h*${topTextY / 100}-text_h/2:borderw=3:bordercolor=black`;
              isFirst = false;
            }
            if (bottomText) {
              const escapedBottom = escapeText(bottomText, i + 1);
              const separator = (isFirst && textVF.startsWith("[")) ? "" : ",";
              textVF += `${separator}drawtext=fontfile=font.ttf:text='${escapedBottom}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h*${bottomTextY / 100}-text_h/2:borderw=3:bordercolor=black`;
              isFirst = false;
            }
            filterParts.push(`${textVF}[final_v]`);
            finalVideoLabel = "[final_v]";
          }

          const outV = finalVideoLabel;
          const outA = (hookIdx !== -1) ? "[concat_a]" : "[main_a]";
          args.push(
            "-filter_complex", filterParts.join("; "),
            "-map", outV,
            "-map", outA,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "192k",
            "-avoid_negative_ts", "1",
            outputName
          );
        }

        // Run segment processing
        console.log(`Executing FFmpeg segment ${i + 1}/${numSegments} with arguments:`, args);
        let exitCode: number;
        try {
          exitCode = await ffmpeg.exec(args);
        } catch (execErr) {
          console.error(`FFmpeg execution encountered a fatal crash for segment ${i + 1}:`, execErr);
          throw execErr;
        }

        console.log(`FFmpeg segment ${i + 1} completed with exit code:`, exitCode);
        if (exitCode !== 0) {
          const lastLogs = logsRef.current.slice(-15).join("\n");
          throw new Error(`FFmpeg failed on segment ${i + 1} (exit code ${exitCode}).\n\nArguments:\n${args.join(" ")}\n\nLast FFmpeg logs:\n${lastLogs}`);
        }
        
        // Read file into memory and delete from virtual FS instantly to save memory
        console.log(`Reading output file ${outputName} from virtual filesystem...`);
        let data: Uint8Array;
        try {
          data = await ffmpeg.readFile(outputName) as Uint8Array;
        } catch (readErr) {
          console.error(`Failed to read output file ${outputName}:`, readErr);
          throw readErr;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = new Blob([data as any], { type: "video/mp4" });
        const url = URL.createObjectURL(blob);
        newResults.push({ name: outputName, url });
        
        await ffmpeg.deleteFile(outputName).catch(() => {});
      }
      
      setResults(newResults);
    } catch (err) {
      console.error("Splitting failed:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`An error occurred during video composition:\n\n${errMsg}\n\nCheck browser console for full FFmpeg execution logs.`);
    } finally {
      // 4. Final filesystem cleanup
      try {
        await ffmpeg.deleteFile(videoFile.name).catch(() => {});
        if (bgVideoFile) await ffmpeg.deleteFile(bgVideoFile.name).catch(() => {});
        if (bgAudioFile) await ffmpeg.deleteFile(bgAudioFile.name).catch(() => {});
        if (watermarkFile) await ffmpeg.deleteFile("watermark.png").catch(() => {});
        await ffmpeg.deleteFile("font.ttf").catch(() => {});
        if (isHookEnabled && hookFiles.length > 0) {
          for (const hook of hookFiles) {
            await ffmpeg.deleteFile(hook.name).catch(() => {});
          }
        }
      } catch (e) {
        console.error("Cleanup error:", e);
      }
      setProcessing(false);
      setProgress(0);
      setStatusDetail("");
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
    } catch (err) {
      const error = err as { name?: string };
      if (error.name !== "AbortError") {
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


  const startDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, type: "top" | "bottom" | "watermark") => {
    e.preventDefault();
    const container = previewRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    
    const updatePosition = (moveEvent: MouseEvent | TouchEvent) => {
      const clientY = "touches" in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const clientX = "touches" in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      
      const yPercent = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100));
      
      if (type === "top") {
        setTopTextY(Math.round(yPercent));
      } else if (type === "bottom") {
        setBottomTextY(Math.round(yPercent));
      } else if (type === "watermark") {
        const xPercent = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100));
        setWatermarkX(Math.round(xPercent));
        setWatermarkY(Math.round(yPercent));
      }
    };
    
    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      updatePosition(moveEvent);
    };
    
    const onEnd = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
    };
    
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onEnd);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const numNominalSegments = Math.ceil((duration - startOffset) / segmentLength);
  const isLargeFile = videoFile && videoFile.size > 1.2 * 1024 * 1024 * 1024; // 1.2 GB

  const activeSubtitle = subtitlesList.find(sub => previewTime >= sub.start && previewTime <= sub.end);

  return (
    <div 
      className="max-w-6xl mx-auto mt-12 mb-24 rounded-[24px] border border-border bg-surface overflow-hidden"
      style={{ boxShadow: '0 10px 80px rgba(108,99,255,0.08)' }}
    >
      {/* Tool header bar */}
      <div className="bg-surface-2 border-b border-border py-4 px-6 flex justify-between items-center">
        <div className="text-sm font-bold text-text-1 flex items-center gap-2">
          <span>✂️</span> Auto Clipper Dashboard
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green/80"></div>
        </div>
      </div>

      {!loaded ? (
        <div className="flex flex-col items-center justify-center p-24 bg-surface">
          <RefreshCw className="w-12 h-12 text-accent animate-spin mb-4" />
          <p className="text-text-2 font-semibold tracking-wide text-sm">{loadingMsg}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[50%_50%] gap-0 items-stretch">
          
          {/* Left panel - Drop Zone & Real-Time Preview */}
          <div className="bg-surface p-8 flex flex-col h-full items-center justify-start min-h-[580px] border-b md:border-b-0 border-border">
            {!videoFile ? (
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="relative group border-2 border-dashed border-border hover:border-accent bg-transparent hover:bg-accent-glow rounded-2xl p-10 transition-all text-center cursor-pointer flex flex-col items-center justify-center w-full flex-1 min-h-[400px]"
              >
                <input 
                  type="file" 
                  accept="video/mp4,video/x-m4v,video/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-[72px] h-[72px] rounded-full bg-accent-glow group-hover:scale-110 transition-transform"></div>
                  <UploadCloud className="w-10 h-10 text-accent relative z-10" />
                </div>
                <h3 className="text-text-1 font-semibold text-base mb-1">Drag and drop video</h3>
                <p className="text-text-2 text-xs mb-6 max-w-[200px] mx-auto">Supports MP4, MOV, MKV, WebM up to local browser limits</p>
                <div className="px-5 py-2.5 bg-surface-2 border border-border text-text-1 rounded-full text-xs font-bold hover:bg-border transition-all hover:scale-105 active:scale-95 shadow-sm">
                  Browse Files
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center justify-start flex-1 space-y-5">
                {/* iPhone-style or Landscape Mockup Preview based on ratio */}
                {isReelFormat ? (
                  <div 
                    ref={previewRef}
                    className={`relative bg-black rounded-[38px] border-[10px] border-[#2A2A3A] dark:border-[#1E1E2A] shadow-2xl overflow-hidden flex items-center justify-center ring-4 ring-accent-glow transition-all ${
                      aspectRatio === "4:5" ? "aspect-[4/5] h-[380px]" : "aspect-[9/16] h-[460px]"
                    }`}
                  >
                    
                    {/* iPhone Notch */}
                    {aspectRatio === "9:16" && (
                      <div className="absolute top-2 w-20 h-4 bg-black rounded-full z-40 left-1/2 -translate-x-1/2 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 ml-auto mr-2.5"></div>
                      </div>
                    )}

                    {/* Simulated Split-Screen */}
                    {isGenZSplit && bgVideoFile ? (
                      <div className="w-full h-full flex flex-col">
                        <div className="w-full h-[50%] relative overflow-hidden border-b border-neutral-800">
                          <video
                            src={videoSrc || undefined}
                            controls
                            muted
                            loop
                            className="absolute w-full h-full object-cover"
                            onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                          />
                        </div>
                        <div className="w-full h-[50%] relative overflow-hidden bg-neutral-900 flex items-center justify-center">
                          {bgVideoSrc ? (
                            <video
                              src={bgVideoSrc}
                              muted
                              loop
                              autoPlay
                              playsInline
                              className="absolute w-full h-full object-cover"
                            />
                          ) : (
                            <>
                              <span className="absolute text-[9px] text-text-2 font-bold uppercase tracking-wider z-10 bg-black/60 px-2.5 py-1 rounded-md border border-border">Gameplay Background</span>
                              <div className="w-full h-full bg-gradient-to-tr from-accent/20 to-purple-500/20 animate-pulse absolute"></div>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Framing preview simulation
                      <div className="w-full h-full flex items-center justify-center bg-black relative">
                        {framingMode === "blur" ? (
                          <>
                            <video
                              src={videoSrc || undefined}
                              muted
                              loop
                              className="absolute inset-0 w-full h-full object-cover blur-md opacity-45 scale-110"
                            />
                            <video
                              src={videoSrc || undefined}
                              controls
                              muted
                              loop
                              className="relative w-full h-auto object-contain z-10"
                              onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                            />
                          </>
                        ) : (
                          <video
                            src={videoSrc || undefined}
                            controls
                            muted
                            loop
                            className={`w-full h-full ${framingMode === "letterbox" ? "object-contain bg-black" : "object-cover"}`}
                            onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                          />
                        )}
                      </div>
                    )}

                    {/* Top Text overlay */}
                    {topText && (
                      <div 
                        onMouseDown={(e) => startDrag(e, "top")}
                        onTouchStart={(e) => startDrag(e, "top")}
                        className="absolute left-0 right-0 px-4 text-center select-none cursor-move z-20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                        style={{
                          top: `${topTextY}%`,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <span 
                          className="inline-block text-white font-sans font-black text-sm tracking-wide uppercase break-words max-w-[95%] pointer-events-none select-none"
                          style={{ textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000' }}
                        >
                          {topText.replace(/{n}/g, "1")}
                        </span>
                      </div>
                    )}

                    {/* Bottom Text overlay */}
                    {bottomText && (
                      <div 
                        onMouseDown={(e) => startDrag(e, "bottom")}
                        onTouchStart={(e) => startDrag(e, "bottom")}
                        className="absolute left-0 right-0 px-4 text-center select-none cursor-move z-20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                        style={{
                          top: `${bottomTextY}%`,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <span 
                          className="inline-block text-white font-sans font-black text-sm tracking-wide uppercase break-words max-w-[95%] pointer-events-none select-none"
                          style={{ textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000' }}
                        >
                          {bottomText.replace(/{n}/g, "1")}
                        </span>
                      </div>
                    )}

                    {/* Watermark position overlay preview */}
                    {watermarkFile && (
                      <div 
                        onMouseDown={(e) => startDrag(e, "watermark")}
                        onTouchStart={(e) => startDrag(e, "watermark")}
                        className="absolute z-30 select-none cursor-move hover:scale-105 active:scale-95 transition-transform"
                        style={{
                          left: `${watermarkX}%`,
                          top: `${watermarkY}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="bg-black/80 px-2 py-1 rounded border border-white/30 text-white text-[9px] font-bold flex items-center gap-1 shadow-lg backdrop-blur-sm pointer-events-auto">
                          🖼️ Logo (Drag me)
                        </div>
                      </div>
                    )}

                    {/* Safe-Zone Guide Overlay */}
                    {showSafeZone && (
                      <div className="absolute inset-0 pointer-events-none select-none z-30 bg-black/25">
                        {/* Headers */}
                        <div className="absolute top-8 left-0 right-0 flex justify-center gap-4 text-[10px] font-bold text-white drop-shadow">
                          <span>Following</span>
                          <span className="border-b-2 border-white text-white">For You</span>
                        </div>

                        {/* Right Sidebar Icons */}
                        <div className="absolute right-2.5 bottom-14 flex flex-col items-center gap-3">
                          <div className="relative w-7 h-7 rounded-full border border-white bg-white/20 flex items-center justify-center shadow">
                            <span className="text-[10px] text-white">👤</span>
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-red border border-white rounded-full w-2.5 h-2.5 flex items-center justify-center text-[7px] text-white font-bold">+</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-white text-lg drop-shadow-md">❤️</span>
                            <span className="text-[8px] text-white font-bold drop-shadow">123.4K</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-white text-lg drop-shadow-md">💬</span>
                            <span className="text-[8px] text-white font-bold drop-shadow">1,245</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-white text-lg drop-shadow-md">⭐</span>
                            <span className="text-[8px] text-white font-bold drop-shadow">12.4K</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-white text-lg drop-shadow-md">↗️</span>
                            <span className="text-[8px] text-white font-bold drop-shadow">5.2K</span>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-black border border-white/40 animate-spin flex items-center justify-center text-[9px] shadow-md">
                            🎵
                          </div>
                        </div>

                        {/* Captions */}
                        <div className="absolute left-3 bottom-4 right-14 text-left flex flex-col gap-0.5 text-white drop-shadow">
                          <span className="font-bold text-[10.5px]">@clipper_expert</span>
                          <span className="text-white/95 text-[8.5px] line-clamp-2 leading-tight">Align your text within the grid lines so social media UI elements do not block it. #viral #shorts #reels</span>
                          <span className="text-white/85 text-[8.5px] flex items-center gap-0.5">🎵 Original Sound - Clipper</span>
                        </div>

                        {/* Live Subtitle Overlay */}
                        {activeSubtitle && (
                          <div className="absolute bottom-[24%] left-0 right-0 px-4 text-center pointer-events-none z-30 animate-fade-in">
                            <span 
                              className="inline-block bg-black/75 text-white font-sans font-extrabold text-[11px] px-2.5 py-1 rounded-md border border-white/10 shadow-lg break-words max-w-[90%]"
                              style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
                            >
                              {activeSubtitle.text}
                            </span>
                          </div>
                        )}

                        {/* Dashed grid safe zone */}
                        <div className="absolute top-[16%] bottom-[18%] left-11 right-11 border-2 border-dashed border-amber-500 bg-amber-500/8 rounded flex items-center justify-center">
                          <span className="text-[8.5px] text-white bg-amber-600 px-2 py-0.5 rounded font-mono font-black uppercase tracking-wider shadow">Safe Text Area</span>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  // Landscape standard preview
                  <div 
                    ref={previewRef}
                    className="relative w-full max-h-[300px] bg-black rounded-2xl border border-border overflow-hidden flex items-center justify-center shadow-lg"
                  >
                    <video
                      src={videoSrc || undefined}
                      controls
                      muted
                      loop
                      className="w-full max-h-[300px]"
                      onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                    />
                    
                    {topText && (
                      <div 
                        onMouseDown={(e) => startDrag(e, "top")}
                        onTouchStart={(e) => startDrag(e, "top")}
                        className="absolute left-0 right-0 px-4 text-center select-none cursor-move z-20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                        style={{
                          top: `${topTextY}%`,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <span 
                          className="inline-block text-white font-sans font-black text-sm tracking-wide uppercase break-words max-w-[95%] pointer-events-none select-none"
                          style={{ textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000' }}
                        >
                          {topText.replace(/{n}/g, "1")}
                        </span>
                      </div>
                    )}
                    {bottomText && (
                      <div 
                        onMouseDown={(e) => startDrag(e, "bottom")}
                        onTouchStart={(e) => startDrag(e, "bottom")}
                        className="absolute left-0 right-0 px-4 text-center select-none cursor-move z-20 hover:scale-[1.01] active:scale-[0.99] transition-transform"
                        style={{
                          top: `${bottomTextY}%`,
                          transform: 'translateY(-50%)'
                        }}
                      >
                        <span 
                          className="inline-block text-white font-sans font-black text-sm tracking-wide uppercase break-words max-w-[95%] pointer-events-none select-none"
                          style={{ textShadow: '-1.5px -1.5px 0 #000, 1.5px -1.5px 0 #000, -1.5px 1.5px 0 #000, 1.5px 1.5px 0 #000' }}
                        >
                          {bottomText.replace(/{n}/g, "1")}
                        </span>
                      </div>
                    )}
                    {/* Live Subtitle Overlay */}
                    {activeSubtitle && (
                      <div className="absolute bottom-[8%] left-0 right-0 px-4 text-center pointer-events-none z-30 animate-fade-in">
                        <span 
                          className="inline-block bg-black/75 text-white font-sans font-extrabold text-[11px] px-2.5 py-1 rounded-md border border-white/10 shadow-lg break-words max-w-[90%]"
                          style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
                        >
                          {activeSubtitle.text}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Toolbar */}
                <div className="w-full bg-surface-2 border border-border rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center text-xs text-text-2 gap-2">
                    <span className="font-bold text-text-1 truncate max-w-[220px]" title={videoFile.name}>
                      📄 {videoFile.name}
                    </span>
                    <span className="shrink-0 flex items-center gap-2 text-text-2 font-medium">
                      <Clock className="w-3.5 h-3.5 text-accent" /> {formatTime(duration)}
                      <span className="text-border">|</span>
                      <HardDrive className="w-3.5 h-3.5 text-accent" /> {formatSize(videoFile.size)}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 justify-between pt-3 border-t border-border/50">
                    <button
                      onClick={() => setShowSafeZone(!showSafeZone)}
                      disabled={!isReelFormat}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                        !isReelFormat 
                          ? "opacity-30 cursor-not-allowed border-border text-text-2 bg-transparent" 
                          : showSafeZone
                            ? "bg-accent border-accent text-white hover:brightness-110 shadow-sm" 
                            : "bg-surface border-border text-text-2 hover:text-text-1 hover:border-text-1"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      Safe-Zone Overlay: {showSafeZone ? "ON" : "OFF"}
                    </button>
                    
                    <button 
                      onClick={resetState}
                      disabled={processing}
                      className="px-3 py-1.5 text-red text-xs font-bold hover:bg-red/10 border border-transparent hover:border-red/20 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Remove Video
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

                 {/* Right panel - Settings */}
          <div className="bg-surface-2 border-l border-border p-6 flex flex-col h-full min-h-[580px] justify-between">
            <div>
              <h3 className="font-display font-extrabold text-sm text-text-1 mb-4 flex items-center gap-1.5">
                <span>🛠️</span> Clipper Setup Panel
              </h3>

              {/* Tab Navigation */}
              <div className="flex bg-surface border border-border p-1 rounded-xl mb-5 gap-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenSection("basic")}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    openSection === "basic"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-2 hover:text-text-1 hover:bg-surface-2"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>1. Framing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenSection("viral")}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    openSection === "viral"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-2 hover:text-text-1 hover:bg-surface-2"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>2. Viral Boost</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenSection("overlays")}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    openSection === "overlays"
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-2 hover:text-text-1 hover:bg-surface-2"
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>3. Overlays</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="space-y-4">
                
                {/* TAB 1: FRAMING & DURATION */}
                {openSection === "basic" && (
                  <div className="space-y-4 animate-fade-in">
                    {/* Platform Presets inside Framing */}
                    <div className="bg-surface p-3.5 rounded-xl border border-border">
                      <span className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2">Platform Presets</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => applyPreset("tiktok")}
                          className={`py-1.5 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                            aspectRatio === "9:16" && segmentLengthMinutes === 1.0
                              ? "bg-accent border-accent text-white"
                              : "bg-surface-2 border-border text-text-1 hover:bg-border"
                          }`}
                        >
                          TikTok
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("shorts")}
                          className={`py-1.5 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                            aspectRatio === "9:16" && segmentLengthMinutes === 0.983
                              ? "bg-red border-red text-white"
                              : "bg-surface-2 border-border text-text-1 hover:bg-border"
                          }`}
                        >
                          YT Shorts
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset("fb_li")}
                          className={`py-1.5 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                            aspectRatio === "4:5"
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-surface-2 border-border text-text-1 hover:bg-border"
                          }`}
                        >
                          FB / LI
                        </button>
                      </div>
                    </div>

                    {/* Aspect Ratio Cards */}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2 flex items-center gap-1">
                        Aspect Ratio
                        <span className="text-[11px] font-normal text-text-2 font-sans lowercase">(determines layout shape)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "9:16", label: "9:16 Vertical", desc: "TikTok, Shorts, Reels", icon: "📱" },
                          { id: "4:5", label: "4:5 Portrait", desc: "FB & LinkedIn Posts", icon: "📐" },
                          { id: "original", label: "Original Ratio", desc: "Landscape / Raw Ratio", icon: "🖥️" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setAspectRatio(opt.id as "9:16" | "4:5" | "original");
                              if (opt.id === "original") {
                                setIsReelFormat(false);
                              } else {
                                setIsReelFormat(true);
                              }
                            }}
                            className={`p-2 rounded-xl border font-semibold text-left transition-all cursor-pointer flex flex-col justify-between h-auto min-h-[92px] py-2.5 px-2.5 ${
                              aspectRatio === opt.id
                                ? "bg-accent/10 border-accent ring-1 ring-accent text-text-1"
                                : "bg-surface border-border/85 text-text-1 hover:border-text-2 hover:bg-border/5"
                            }`}
                          >
                            <span className="text-base">{opt.icon}</span>
                            <div>
                              <div className="text-xs font-black leading-tight">{opt.label}</div>
                              <div className="text-[11px] text-text-2 font-normal leading-tight mt-0.5">{opt.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Export Resolution Selector */}
                    <div>
                      <label className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2 flex items-center gap-1">
                        Export Resolution
                        <span className="text-[11px] font-normal text-text-2 font-sans lowercase">(lower = much faster)</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "360p", label: "360p", desc: "Super Fast (Web)", icon: "⚡" },
                          { id: "480p", label: "480p", desc: "Fast (Default)", icon: "🚀" },
                          { id: "720p", label: "720p", desc: "Normal (Slow)", icon: "📺" }
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setExportResolution(opt.id as "360p" | "480p" | "720p")}
                            className={`p-2 rounded-xl border font-semibold text-left transition-all cursor-pointer flex flex-col justify-between h-auto min-h-[92px] py-2.5 px-2.5 ${
                              exportResolution === opt.id
                                ? "bg-accent/10 border-accent ring-1 ring-accent text-text-1"
                                : "bg-surface border-border/85 text-text-1 hover:border-text-2 hover:bg-border/5"
                            }`}
                          >
                            <span className="text-base">{opt.icon}</span>
                            <div>
                              <div className="text-xs font-black leading-tight">{opt.label}</div>
                              <div className="text-[11px] text-text-2 font-normal leading-tight mt-0.5">{opt.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Framing Layout Cards */}
                    {aspectRatio !== "original" && (
                      <div>
                        <label className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2 flex items-center gap-1">
                          Framing Layout
                          <span className="text-[11px] font-normal text-text-2 font-sans lowercase">(how video fits canvas)</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "crop", label: "Center-Crop", desc: "Zoom & fill vertical frame", icon: "✂️" },
                            { id: "letterbox", label: "Letterbox", desc: "Fit with black padding bars", icon: "🔳" },
                            { id: "blur", label: "Ambient Blur", desc: "Fit with blurred background", icon: "✨" }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setFramingMode(opt.id as "crop" | "letterbox" | "blur")}
                              className={`p-2 rounded-xl border font-semibold text-left transition-all cursor-pointer flex flex-col justify-between h-auto min-h-[92px] py-2.5 px-2.5 ${
                                framingMode === opt.id
                                  ? "bg-accent/10 border-accent ring-1 ring-accent text-text-1"
                                  : "bg-surface border-border/85 text-text-1 hover:border-text-2 hover:bg-border/5"
                              }`}
                            >
                              <span className="text-base">{opt.icon}</span>
                              <div>
                                <div className="text-xs font-black leading-tight">{opt.label}</div>
                                <div className="text-[11px] text-text-2 font-normal leading-tight mt-0.5">{opt.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Segment Length Slider + Input */}
                    <div className="bg-surface p-3.5 rounded-xl border border-border/80">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs uppercase tracking-wider text-text-2 font-bold flex items-center gap-1">
                          Segment Duration
                        </label>
                        <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg px-2 py-0.5">
                          <input
                            type="number"
                            min={0.1}
                            step={0.01}
                            max={duration > 0 ? Math.ceil(duration / 60) : 100}
                            value={segmentLengthMinutes}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (val > 0) {
                                setSegmentLengthMinutes(val);
                              }
                            }}
                            className="w-12 bg-transparent text-xs text-text-1 font-bold border-none outline-none text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-xs text-text-2 font-semibold font-sans">min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min={0.1} 
                          step={0.01}
                          max={duration > 0 ? Math.ceil(duration / 60) : 10} 
                          value={segmentLengthMinutes} 
                          onChange={(e) => setSegmentLengthMinutes(Number(e.target.value))}
                          className="flex-1 accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-text-2 font-mono shrink-0 w-10 text-right">
                          {Math.floor(segmentLengthMinutes * 60)}s
                        </span>
                      </div>
                    </div>

                    {/* Output Prefix & Scene-Cut Splits */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-1">Output Prefix</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={prefix}
                            onChange={(e) => setPrefix(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-1 placeholder-text-2/30 text-xs transition-all font-bold"
                            placeholder="e.g. clip"
                          />
                          <div className="absolute inset-y-0 right-2.5 flex items-center text-text-2 text-xs pointer-events-none font-mono font-bold">
                            _1.mp4
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 mb-1">
                          <label className="text-xs uppercase tracking-wider text-text-2 font-bold block">Scene-Cut Splits</label>
                          <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">🐢 Slow on Web</span>
                        </div>
                        <div className="flex items-center justify-between bg-surface border border-border px-2.5 py-1.5 rounded-lg h-[34px]">
                          <span className="text-xs text-text-2 font-semibold">Auto Transitions</span>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={useSceneCut}
                              onChange={(e) => setUseSceneCut(e.target.checked)}
                            />
                            <div className="w-7 h-4 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: VIRAL BOOST FEATURES */}
                {openSection === "viral" && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Intro trimmer card */}
                    <div className="bg-surface border border-border p-3 rounded-xl transition-all hover:bg-border/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          <span className="text-sm mt-0.5">⏱️</span>
                          <div>
                            <label className="text-xs font-bold text-text-1 block mb-0.5">Start Offset (Intro Trimmer)</label>
                            <p className="text-xs text-text-2 leading-tight max-w-[220px]">Strip stream intro or loading screens before splitting</p>
                          </div>
                        </div>
                        <div className="relative w-20 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={duration > 0 ? Math.floor(duration - 1) : 1000}
                            value={startOffset}
                            onChange={(e) => setStartOffset(Math.max(0, Number(e.target.value)))}
                            className="w-full pr-5 pl-1.5 py-1 bg-surface-2 border border-border rounded-lg focus:border-accent outline-none text-text-1 text-xs font-bold text-right"
                          />
                          <span className="absolute right-1.5 inset-y-0 flex items-center text-xs text-text-2 font-mono pointer-events-none font-bold">s</span>
                        </div>
                      </div>
                    </div>

                    {/* The "Gen Z Split" Card */}
                    <div className="bg-surface border border-border p-3 rounded-xl transition-all hover:bg-border/5 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="text-sm mt-0.5">📱</span>
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <label className="text-xs font-bold text-text-1 block">The &quot;Gen Z Split&quot;</label>
                              <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">🐢 Slow on Web</span>
                            </div>
                            <p className="text-xs text-text-2 leading-tight max-w-[220px]">Stack gameplay/parkour background looping vertically</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isGenZSplit}
                            disabled={!isReelFormat}
                            onChange={(e) => {
                              setIsGenZSplit(e.target.checked);
                              if (e.target.checked) {
                                setIsReelFormat(true);
                                setAspectRatio("9:16");
                              }
                            }}
                          />
                          <div className="w-8 h-4.5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-40"></div>
                        </label>
                      </div>
                      
                      {isGenZSplit && (
                        <div className="mt-1 bg-surface-2 p-2.5 rounded-lg border border-border space-y-2 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-text-2 uppercase tracking-wider">Secondary Background Video</span>
                            <label className="relative flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface hover:bg-accent-glow py-2.5 px-3 rounded-lg cursor-pointer transition-all text-center">
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setBgVideoFile(file);
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <UploadCloud className="w-4 h-4 text-accent mb-0.5" />
                              <span className="text-xs text-text-1 font-semibold">Choose video file</span>
                            </label>
                          </div>
                          {bgVideoFile && (
                            <div className="flex justify-between items-center bg-surface p-1.5 rounded-lg border border-border text-xs">
                              <span className="truncate text-text-1 font-medium max-w-[170px]" title={bgVideoFile.name}>
                                📄 {bgVideoFile.name}
                              </span>
                              <button
                                onClick={() => setBgVideoFile(null)}
                                className="text-red hover:text-red/80 p-0.5 rounded hover:bg-surface-2 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Viral Hooks Card */}
                    <div className="bg-surface border border-border p-3 rounded-xl transition-all hover:bg-border/5 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-2">
                          <span className="text-sm mt-0.5">🪝</span>
                          <div>
                            <label className="text-xs font-bold text-text-1 block mb-0.5">Viral Hooks Randomizer</label>
                            <p className="text-xs text-text-2 leading-tight max-w-[220px]">Prepend a random short (1-3s) clip before each part</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer mt-1 shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={isHookEnabled}
                            onChange={(e) => setIsHookEnabled(e.target.checked)}
                          />
                          <div className="w-8 h-4.5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>
                      
                      {isHookEnabled && (
                        <div className="mt-1 bg-surface-2 p-2.5 rounded-lg border border-border space-y-2.5 animate-fade-in">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-text-2 uppercase tracking-wider">Upload Hooks (Multiple OK)</span>
                            <label className="relative flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface hover:bg-accent-glow py-2.5 px-3 rounded-lg cursor-pointer transition-all text-center">
                              <input
                                type="file"
                                multiple
                                accept="video/*"
                                onChange={handleHookFilesChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <UploadCloud className="w-4 h-4 text-accent mb-0.5" />
                              <span className="text-xs text-text-1 font-semibold">Choose video files</span>
                            </label>
                          </div>
                          
                          {hookFiles.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {hookFiles.map((file, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-surface p-1 rounded-lg border border-border text-xs">
                                  <span className="truncate text-text-1 font-medium max-w-[140px]" title={file.name}>
                                    📄 {file.name}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-text-2 text-[11px] bg-surface-2 px-1.5 py-0.5 rounded font-bold border border-border">
                                      {hookDurations[file.name] ? `${hookDurations[file.name].toFixed(1)}s` : "..."}
                                    </span>
                                    <button
                                      onClick={() => handleRemoveHook(idx)}
                                      className="text-red hover:text-red/80 p-0.5 rounded hover:bg-surface-2 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bypass Copyright Card */}
                    <div className="bg-surface border border-border p-3 rounded-xl transition-all hover:bg-border/5 flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className="text-sm mt-0.5">🛡️</span>
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <label className="text-xs font-bold text-text-1 block">Bypass Duplication Filters</label>
                            <span className="bg-yellow-500/10 text-yellow-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-500/20">🐢 Slow on Web</span>
                          </div>
                          <p className="text-xs text-text-2 leading-tight max-w-[220px]">
                            Shift speed (1.01x-1.03x), colors, and zoom to bypass copy-detectors
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={bypassCopyright}
                          onChange={(e) => setBypassCopyright(e.target.checked)}
                        />
                        <div className="w-8 h-4.5 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* TAB 3: TEXT, SUBTITLES & LOGO OVERLAYS */}
                {openSection === "overlays" && (
                  <div className="space-y-3 animate-fade-in">
                    {/* Text Overlays Card */}
                    <div className="bg-surface border border-border p-3 rounded-xl space-y-3">
                      <span className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-1 flex items-center gap-1">
                        📝 Title Overlays
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-text-2 uppercase block mb-1">Top Text</label>
                          <input 
                            type="text" 
                            value={topText}
                            onChange={(e) => setTopText(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-1 placeholder-text-2/30 text-xs transition-all font-bold"
                            placeholder="e.g. Part {n}"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-text-2 uppercase block mb-1">Bottom Text</label>
                          <input 
                            type="text" 
                            value={bottomText}
                            onChange={(e) => setBottomText(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-surface-2 border border-border rounded-lg focus:border-accent focus:ring-1 focus:ring-accent outline-none text-text-1 placeholder-text-2/30 text-xs transition-all font-bold"
                            placeholder="e.g. Subscribe!"
                          />
                        </div>
                      </div>
                      <div className="bg-surface-2 border border-border p-2 rounded-lg flex items-start gap-2 text-xs text-text-2 leading-relaxed font-sans">
                        <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <p>Use <code className="text-accent font-mono font-bold">{`{n}`}</code> to insert the dynamic part number automatically.</p>
                      </div>
                    </div>

                    {/* Auto-BGM Card */}
                    <div className="bg-surface border border-border p-3 rounded-xl flex flex-col gap-2">
                      <span className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-1 flex items-center gap-1">
                        🎵 Background Music (Auto-BGM)
                      </span>
                      <label className="relative flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface-2 hover:bg-accent-glow py-2.5 px-3 rounded-lg cursor-pointer transition-all text-center">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setBgAudioFile(file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Music className="w-4 h-4 text-accent mb-0.5" />
                        <span className="text-xs text-text-1 font-semibold font-sans">Choose audio file</span>
                      </label>
                      
                      {bgAudioFile && (
                        <div className="space-y-2 mt-1">
                          <div className="flex justify-between items-center bg-surface-2 p-1.5 rounded-lg border border-border text-xs">
                            <span className="truncate text-text-1 font-medium max-w-[170px]" title={bgAudioFile.name}>
                              🎵 {bgAudioFile.name}
                            </span>
                            <button
                              onClick={() => setBgAudioFile(null)}
                              className="text-red hover:text-red/80 p-0.5 rounded hover:bg-surface cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          <div>
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-text-2 mb-1">
                              <span>Volume</span>
                              <span className="text-accent">{Math.round(bgmVolume * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-3 h-3 text-text-2" />
                              <input 
                                type="range" 
                                min={0} 
                                max={1} 
                                step={0.01}
                                value={bgmVolume} 
                                onChange={(e) => setBgmVolume(Number(e.target.value))}
                                className="flex-1 accent-accent h-1.5 bg-border rounded-lg appearance-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Subtitles & Watermark grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2">📝 Subtitles (.SRT)</span>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="relative flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface-2 hover:bg-accent-glow py-2 px-1 rounded-lg cursor-pointer transition-all text-center h-[54px]">
                              <input
                                type="file"
                                accept=".srt"
                                onChange={handleSrtChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <Type className="w-4 h-4 text-accent mb-0.5" />
                              <span className="text-[10px] text-text-1 font-semibold leading-tight">Choose SRT</span>
                            </label>
                            
                            <button
                              type="button"
                              onClick={generateCaptions}
                              disabled={!videoFile || isTranscribing}
                              className="flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface-2 hover:bg-accent-glow py-2 px-1 rounded-lg cursor-pointer transition-all text-center h-[54px] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Sparkles className="w-4 h-4 text-accent mb-0.5 animate-pulse" />
                              <span className="text-[10px] text-text-1 font-semibold leading-tight">
                                {isTranscribing ? "Generating..." : "Auto AI SRT"}
                              </span>
                            </button>
                          </div>
                        </div>
                        {isTranscribing && (
                          <div className="mt-2 p-2 bg-accent-glow border border-accent/20 rounded-lg text-[10px] text-text-1 flex flex-col gap-1.5 animate-fade-in">
                            <div className="flex justify-between font-bold">
                              <span className="animate-pulse">{transcriptionStatus}</span>
                            </div>
                            {transcriptionStatus.includes("Downloading") && (
                              <div className="w-full bg-border rounded-full h-1">
                                <div 
                                  className="bg-accent h-1 rounded-full transition-all duration-300" 
                                  style={{ width: `${transcriptionProgress}%` }}
                                ></div>
                              </div>
                            )}
                          </div>
                        )}
                        {srtFile && !isTranscribing && (
                          <div className="flex justify-between items-center bg-surface-2 p-1 rounded-lg border border-border text-xs mt-2">
                            <span className="truncate text-text-1 font-medium max-w-[80px]" title={srtFile.name}>
                              📄 {srtFile.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSrtFile(null);
                                setSubtitlesList([]);
                              }}
                              className="text-red hover:text-red/80 p-0.5 rounded hover:bg-surface cursor-pointer animate-fade-in"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-surface border border-border p-3 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-text-2 font-bold block mb-2">🖼️ Watermark (PNG)</span>
                          <label className="relative flex flex-col items-center justify-center border border-dashed border-border hover:border-accent bg-surface-2 hover:bg-accent-glow py-2.5 px-2 rounded-lg cursor-pointer transition-all text-center">
                            <input
                              type="file"
                              accept="image/png,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setWatermarkFile(file);
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <ImageIcon className="w-4 h-4 text-accent mb-0.5" />
                            <span className="text-xs text-text-1 font-semibold">Choose PNG Logo</span>
                          </label>
                        </div>
                        {watermarkFile && (
                          <div className="space-y-1.5 mt-2">
                            <div className="flex justify-between items-center bg-surface-2 p-1 rounded-lg border border-border text-xs">
                              <span className="truncate text-text-1 font-medium max-w-[80px]" title={watermarkFile.name}>
                                🖼️ {watermarkFile.name}
                              </span>
                              <button
                                onClick={() => setWatermarkFile(null)}
                                className="text-red hover:text-red/80 p-0.5 rounded hover:bg-surface cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                            <div>
                              <select
                                value={watermarkPosition}
                                onChange={(e) => setWatermarkPosition(e.target.value as "topLeft" | "topRight" | "bottomLeft" | "bottomRight")}
                                className="w-full px-1.5 py-0.5 bg-surface-2 border border-border rounded text-xs text-text-1 outline-none focus:border-accent font-bold"
                              >
                                <option value="topRight">Top R</option>
                                <option value="topLeft">Top L</option>
                                <option value="bottomRight">Bottom R</option>
                                <option value="bottomLeft">Bottom L</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Expected Output & Split Button */}
            <div className="mt-auto pt-4 border-t border-border/40">
              
              {/* Size warnings for large files */}
              {isLargeFile && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-lg flex items-start gap-2 text-xs text-amber-500 leading-normal mb-3 animate-pulse">
                  <span className="text-xs shrink-0">⚠️</span>
                  <p><strong>Warning:</strong> File size is {formatSize(videoFile.size)}. Videos larger than 1.2GB can exceed browser tab memory allocation inside WebAssembly. If processing fails or crashes, compress the source file first.</p>
                </div>
              )}

              <div className="w-full bg-surface border border-border rounded-lg p-2.5 flex justify-between items-center mb-3 text-xs">
                <span className="text-text-2 font-medium">Expected Output</span>
                <span className="font-bold text-accent">{numNominalSegments || 0} clips</span>
              </div>

              {!processing ? (
                <button 
                  onClick={handleSplit}
                  disabled={!videoFile || processing}
                  className="w-full py-3 bg-accent text-white rounded-xl font-display font-semibold transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm cursor-pointer shadow-md hover:scale-[1.01] active:scale-95"
                  style={{ boxShadow: videoFile && !processing ? '0 4px 20px rgba(108,99,255,0.3)' : 'none' }}
                >
                  <Scissors className="w-4 h-4" />
                  Split Video
                </button>
              ) : (
                <div className="w-full py-3 bg-surface text-text-1 rounded-xl border border-border flex flex-col items-center justify-center gap-2 px-3 shadow-inner">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                    {statusDetail || `Composition part ${currentClip} of ${totalClips || numNominalSegments}`}
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-accent h-1.5 rounded-full transition-all duration-300 ease-out animate-pulse" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-text-2 text-center leading-tight">
                    Applying filters, mixing audio, and encoding. This runs 100% locally inside client WebAssembly.
                  </span>
                </div>
              )}

              {/* FFmpeg Logs Panel */}
              {ffmpegLogs.length > 0 && (
                <div className="mt-3 w-full bg-[#111116] border border-border/80 rounded-xl p-3 shadow-2xl relative text-left">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
                    <span className="text-[10px] uppercase font-bold text-accent tracking-wider font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse"></span>
                      Local FFmpeg Logs
                    </span>
                    <button 
                      onClick={() => setFfmpegLogs([])}
                      className="text-[9px] font-bold text-text-2 hover:text-red cursor-pointer transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="w-full bg-black font-mono text-[9px] text-neutral-300 h-32 overflow-y-auto flex flex-col-reverse pr-1.5 rounded-lg p-2 border border-neutral-800">
                    <div className="text-left w-full space-y-0.5 select-text">
                      {ffmpegLogs.map((log, idx) => (
                        <div key={idx} className="break-all leading-normal opacity-95 border-l border-accent/20 pl-1">{log}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Results Grid - Keeping it below if results exist */}
      {(results.length > 0) && (
        <div className="p-8 border-t border-border bg-surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-text-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green" />
              Your Clips ({results.length})
            </h3>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer hover:brightness-110 shadow-sm"
              >
                <Archive className="w-4 h-4" />
                {isZipping ? "Zipping..." : "Download ZIP"}
              </button>
              {typeof window !== "undefined" && "showDirectoryPicker" in window && (
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="px-4 py-2 bg-surface-2 border border-border text-text-1 hover:bg-border rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <HardDrive className="w-4 h-4" />
                  {isSaving ? "Saving..." : "Save All to Folder"}
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((res, i) => (
              <div key={i} className="bg-surface-2 p-4 rounded-xl border border-border flex flex-col justify-between group hover:border-accent/50 hover:shadow-md transition-all">
                <div className="mb-4">
                  <h4 className="font-bold text-text-1 truncate text-xs" title={res.name}>📄 {res.name}</h4>
                  <p className="text-xs text-text-2 mt-1 font-mono">
                    Part {i + 1} Clip Segment
                  </p>
                </div>
                <a 
                  href={res.url} 
                  download={res.name}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-surface border border-border text-text-1 hover:bg-border hover:border-text-1 rounded-lg text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
