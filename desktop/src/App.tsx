import React, { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openPath } from "@tauri-apps/plugin-opener";
import { 
  UploadCloud, 
  FileVideo, 
  Scissors, 
  RefreshCw, 
  FolderOpen, 
  Settings, 
  Smartphone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Music,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Sliders,
  Layers,
  Film,
  Play,
  Pause,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Terminal,
  CheckCircle2
} from "lucide-react";
import "./App.css";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export default function App() {
  const [ffmpegInstalled, setFfmpegInstalled] = useState<boolean | null>(null);
  const [checkingFfmpeg, setCheckingFfmpeg] = useState(true);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const blurBgVideoRef = useRef<HTMLVideoElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<string[]>([]);
  const isScrubbingRef = useRef(false);
  
  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<"sizing" | "overlays" | "audio" | "captions" | "advanced">("sizing");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [previewVolume, setPreviewVolume] = useState<number>(1); // 0 to 1
  const [assetsCollapsed, setAssetsCollapsed] = useState(false);
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  // File Paths on Host Disk
  const [videoPath, setVideoPath] = useState<string>("");
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [bgVideoDimensions, setBgVideoDimensions] = useState({ width: 0, height: 0 });
  const [primaryHasAudio, setPrimaryHasAudio] = useState(true);
  const [segmentLengthMinutes, setSegmentLengthMinutes] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>("part");
  const [outputDirectory, setOutputDirectory] = useState<string>("");
  
  // Sizing & Export
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "original">("9:16");
  const [framingMode, setFramingMode] = useState<"crop" | "letterbox" | "blur">("crop");
  const [isReelFormat, setIsReelFormat] = useState(true);
  const [exportResolution, setExportResolution] = useState<"360p" | "480p" | "720p" | "1080p">("1080p");
  
  // Subtitles
  const [srtPath, setSrtPath] = useState<string>("");
  const [subtitlesList, setSubtitlesList] = useState<Subtitle[]>([]);
  
  // Overlays & Safe Zone
  const [watermarkPath, setWatermarkPath] = useState<string>("");
  const [watermarkSrc, setWatermarkSrc] = useState<string>("");
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);

  // Drag Coordinates (Percentages)
  const [topTextY, setTopTextY] = useState<number>(12);
  const [bottomTextY, setBottomTextY] = useState<number>(85);
  const [watermarkX, setWatermarkX] = useState<number>(85);
  const [watermarkY, setWatermarkY] = useState<number>(10);

  // Viral Boost Features
  const [isGenZSplit, setIsGenZSplit] = useState(false);
  const [bgVideoPath, setBgVideoPath] = useState<string>("");
  const [bgVideoSrc, setBgVideoSrc] = useState<string>("");
  
  const [isHookEnabled, setIsHookEnabled] = useState(false);
  const [hookPaths, setHookPaths] = useState<string[]>([]);
  const [hookDurations, setHookDurations] = useState<Record<string, number>>({});
  
  const [isBgAudioEnabled, setIsBgAudioEnabled] = useState(false);
  const [bgAudioPath, setBgAudioPath] = useState<string>("");
  const [bgmVolume, setBgmVolume] = useState<number>(0.10);
  
  const [bypassCopyright, setBypassCopyright] = useState(false);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [useSceneCut, setUseSceneCut] = useState<boolean>(false);

  // Processing Progress States
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState(0);
  const [totalClips, setTotalClips] = useState(0);
  const [statusDetail, setStatusDetail] = useState("");
  const [ffmpegLogs, setFfmpegLogs] = useState<string[]>([]);

  // Transcription States
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [transcriptionStatus, setTranscriptionStatus] = useState("");
  const [previewTime, setPreviewTime] = useState<number>(0);

  const segmentLength = segmentLengthMinutes * 60;

  // Verify FFmpeg installed on startup
  useEffect(() => {
    async function checkFFmpeg() {
      try {
        const installed = await invoke<boolean>("check_ffmpeg_installed");
        setFfmpegInstalled(installed);
      } catch (err) {
        console.error("Failed to check FFmpeg status:", err);
        setFfmpegInstalled(false);
      } finally {
        setCheckingFfmpeg(false);
      }
    }
    checkFFmpeg();
  }, []);

  // Listen to FFmpeg logs emitted by the Rust side
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    
    async function startListening() {
      unlisten = await listen<string>("ffmpeg-log", (event) => {
        const message = event.payload;
        logsRef.current.push(message);
        setFfmpegLogs([...logsRef.current.slice(-120)]);
      });
    }
    
    startListening();
    
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // Sync Video Element volume with state
  useEffect(() => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.volume = previewVolume;
    }
  }, [previewVolume]);

  // Auto-play video when a new source is loaded
  useEffect(() => {
    if (!videoSrc) return;
    const player = videoPlayerRef.current;
    if (!player) return;

    const handleCanPlay = () => {
      player.play()
        .then(() => {
          // Also play blur bg video if present
          if (blurBgVideoRef.current) {
            blurBgVideoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn("Auto-play blocked, user must click to play:", err);
        });
    };

    player.addEventListener("canplay", handleCanPlay, { once: true });
    // Force reload in case the src was set before this effect ran
    player.load();

    return () => {
      player.removeEventListener("canplay", handleCanPlay);
    };
  }, [videoSrc]);

  // Keyboard Shortcuts for Professional Feel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keybinds if the user is typing in forms
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayback();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        seekToTime(Math.max(0, previewTime - (e.shiftKey ? 5 : 1)));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekToTime(Math.min(duration, previewTime + (e.shiftKey ? 5 : 1)));
      } else if (e.code === "KeyS") {
        e.preventDefault();
        setShowSafeZone(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewTime, duration, isPlaying]);

  // Native File Picker functions
  const selectMainVideo = async () => {
    try {
      const path = await invoke<string | null>("select_video_file");
      if (path) {
        setVideoPath(path);
        const url = await invoke<string>("get_video_url", { path });
        setVideoSrc(url);
        setStatusDetail("Querying video details...");
        
        const dur = await invoke<number>("get_video_duration", { path });
        setDuration(dur);
        
        const dims = await invoke<[number, number]>("get_video_dimensions", { path });
        setVideoDimensions({ width: dims[0], height: dims[1] });
        
        const hasAudio = await invoke<boolean>("check_audio_track", { path });
        setPrimaryHasAudio(hasAudio);
        
        if (!outputDirectory) {
          const parentDir = path.substring(0, path.lastIndexOf("/"));
          setOutputDirectory(parentDir);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error loading video details. Verify ffprobe is installed.\n\nError: " + err);
    }
  };

  const selectBgVideoFile = async () => {
    try {
      const path = await invoke<string | null>("select_video_file");
      if (path) {
        setBgVideoPath(path);
        const url = await invoke<string>("get_video_url", { path });
        setBgVideoSrc(url);
        const dims = await invoke<[number, number]>("get_video_dimensions", { path });
        setBgVideoDimensions({ width: dims[0], height: dims[1] });
      }
    } catch (err) {
      console.error(err);
      alert("Error reading background video dimensions:\n" + err);
    }
  };

  const selectWatermarkImage = async () => {
    const path = await invoke<string | null>("select_image_file");
    if (path) {
      setWatermarkPath(path);
      const url = await invoke<string>("get_video_url", { path });
      setWatermarkSrc(url);
    }
  };

  const selectBgAudioFile = async () => {
    const path = await invoke<string | null>("select_audio_file");
    if (path) {
      setBgAudioPath(path);
    }
  };

  const selectSrtSubtitle = async () => {
    const path = await invoke<string | null>("select_srt_file");
    if (path) {
      setSrtPath(path);
      try {
        const content = await invoke<string>("read_text_file", { path });
        const parsed = parseSRT(content);
        setSubtitlesList(parsed);
      } catch (err) {
        alert("Failed to parse subtitle file:\n" + err);
      }
    }
  };

  const selectOutputDir = async () => {
    const path = await invoke<string | null>("select_output_directory");
    if (path) {
      setOutputDirectory(path);
    }
  };

  const addHookFile = async () => {
    const path = await invoke<string | null>("select_video_file");
    if (path) {
      setHookPaths((prev) => [...prev, path]);
      try {
        const dur = await invoke<number>("get_video_duration", { path });
        setHookDurations((prev) => ({ ...prev, [path]: dur }));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const removeHookFile = (idx: number) => {
    setHookPaths((prev) => {
      const copy = [...prev];
      copy.splice(idx, 1);
      return copy;
    });
  };

  // Whisper AI Auto Captioning
  const generateCaptions = async () => {
    if (!videoPath) return;

    setIsTranscribing(true);
    setTranscriptionProgress(0);
    setTranscriptionStatus("Extracting audio natively...");

    try {
      const tempDir = "/tmp";
      const tempWavPath = `${tempDir}/autoclipper_audio_${Date.now()}.wav`;

      const extractArgs = [
        "-i", videoPath,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        tempWavPath
      ];

      await invoke("run_ffmpeg_command", { args: extractArgs });

      setTranscriptionStatus("Loading audio data...");
      const audioUrl = await invoke<string>("get_video_url", { path: tempWavPath });
      const response = await fetch(audioUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch extracted audio from local server: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      // Clean up the temp file
      await invoke("delete_file", { path: tempWavPath }).catch((err) => {
        console.warn("Failed to delete temporary audio file:", err);
      });

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      setTranscriptionStatus("Decoding resampled audio...");

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);
      
      // Close context to prevent leaking system audio threads/resources
      audioCtx.close().catch((err) => {
        console.warn("Failed to close AudioContext:", err);
      });

      setTranscriptionStatus("Initializing local model...");

      const worker = new Worker(`/whisper.worker.js?v=${Date.now()}`, {
        type: "module",
      });

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        setIsTranscribing(false);
        setTranscriptionStatus("");
        alert("Failed to load transcription worker. Check dev console.");
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
          setTranscriptionStatus("Transcribing speech (running locally)...");
          setTranscriptionProgress(0);
        } else if (status === "completed") {
          setIsTranscribing(false);
          setTranscriptionStatus("");

          if (result && result.chunks) {
            const srtContent = convertChunksToSRT(result.chunks);
            const parsed = parseSRT(srtContent);
            setSubtitlesList(parsed);
            alert(`Auto transcription complete! Generated ${parsed.length} subtitles.`);
          } else {
            alert("No speech was detected in this clip.");
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
      console.error(err);
      setIsTranscribing(false);
      setTranscriptionStatus("");
      alert(`Transcription failed:\n${err.message || String(err)}`);
    }
  };

  // SRT Helpers
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
        return `${index + 1}\n${formatSRTTime(startSec)} --> ${formatSRTTime(endSec)}\n${chunk.text.trim()}`;
      })
      .join("\n\n");
  };

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
            console.error("Failed to parse block:", block);
          }
        }
      }
    }
    return subs;
  };

  // Draggable overlays
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

  // Preset Configurations
  const applyPreset = (preset: "tiktok" | "shorts" | "fb_li") => {
    if (preset === "tiktok") {
      setAspectRatio("9:16");
      setFramingMode("crop");
      setSegmentLengthMinutes(1.0);
      setIsReelFormat(true);
    } else if (preset === "shorts") {
      setAspectRatio("9:16");
      setFramingMode("crop");
      setSegmentLengthMinutes(0.95);
      setIsReelFormat(true);
    } else if (preset === "fb_li") {
      setAspectRatio("4:5");
      setFramingMode("letterbox");
      setSegmentLengthMinutes(2.0);
      setIsReelFormat(true);
    }
  };

  // Timeline Scrubbing Mechanics
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;
    isScrubbingRef.current = true;
    updatePlayheadPosition(e.nativeEvent);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isScrubbingRef.current) {
        updatePlayheadPosition(moveEvent);
      }
    };

    const handleMouseUp = () => {
      isScrubbingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const updatePlayheadPosition = (e: MouseEvent) => {
    const track = document.getElementById("timeline-scroll-track");
    if (!track || duration === 0) return;

    const rect = track.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width));
    const seekTime = percentage * duration;

    seekToTime(seekTime);
  };

  const seekToTime = (time: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = time;
      setPreviewTime(time);
    }
  };

  // MAIN SPLITTING COMMAND
  const handleSplit = async () => {
    if (!videoPath || duration === 0 || !outputDirectory) {
      alert("Please configure a source video and an output folder first!");
      return;
    }
    
    logsRef.current = [];
    setFfmpegLogs([]);
    setProcessing(true);
    setProgress(0);
    setStatusDetail("Preparing configurations...");
    
    try {
      const fontPath = await invoke<string>("get_font_path");

      // Calculate segmentation ranges
      const segmentStarts: number[] = [startOffset];
      const effectiveDuration = duration - startOffset;
      const numNominalSegments = Math.ceil(effectiveDuration / segmentLength);
      
      for (let i = 1; i < numNominalSegments; i++) {
        const nominalStart = startOffset + i * segmentLength;
        if (useSceneCut) {
          setStatusDetail(`Analyzing transitions around clip ${i} boundary...`);
          const seekStart = Math.max(0, nominalStart - 5);
          let detectedOffset = -1;
          
          const logListener = await listen<string>("ffmpeg-log", (event) => {
            const message = event.payload;
            if (message.includes("showinfo") && message.includes("pts_time:")) {
              const match = message.match(/pts_time:([0-9.]+)/);
              if (match && detectedOffset === -1) {
                detectedOffset = Number(match[1]);
              }
            }
          });
          
          try {
            await invoke("run_ffmpeg_command", {
              args: [
                "-ss", seekStart.toString(),
                "-t", "10",
                "-i", videoPath,
                "-an",
                "-sn",
                "-vf", "scale=160:-2,select='gt(scene,0.3)',showinfo",
                "-f", "null",
                "null"
              ]
            });
          } catch (e) {
            // Ignore
          } finally {
            logListener();
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
      
      const numSegments = segmentStarts.length;
      setTotalClips(numSegments);
      setCurrentClip(0);
      
      // Hook configurations
      const selectedHookPath = isHookEnabled && hookPaths.length > 0 ? hookPaths[0] : null;
      const hookDuration = selectedHookPath ? (hookDurations[selectedHookPath] || 0) : 0;
      const hookHasAudio = selectedHookPath ? await invoke<boolean>("check_audio_track", { path: selectedHookPath }) : false;

      // Output resolutions
      const maxW = exportResolution === "360p" ? 360 : exportResolution === "480p" ? 480 : exportResolution === "720p" ? 720 : 1080;
      let targetW = maxW;
      let targetH = aspectRatio === "4:5" ? Math.round(maxW * 5 / 4) : Math.round(maxW * 16 / 9);

      if (aspectRatio === "original" && videoDimensions.width > 0) {
        targetW = videoDimensions.width;
        targetH = videoDimensions.height;
      } else if (videoDimensions.width > 0 && videoDimensions.height > 0) {
        if (videoDimensions.width > videoDimensions.height) {
          targetW = Math.min(videoDimensions.height, maxW);
        } else {
          targetW = Math.min(videoDimensions.width, maxW);
        }
        if (targetW % 2 !== 0) targetW--;
        targetH = aspectRatio === "4:5" ? Math.round(targetW * 5 / 4) : Math.round(targetW * 16 / 9);
      }
      if (targetH % 2 !== 0) targetH--;

      // Loop and process each segment natively
      for (let i = 0; i < numSegments; i++) {
        setCurrentClip(i + 1);
        const startTime = segmentStarts[i];
        const endTime = (i < numSegments - 1) ? segmentStarts[i + 1] : duration;
        const currentSegmentLength = endTime - startTime;
        
        const outputName = `${outputDirectory}/${prefix}_${i + 1}.mp4`;
        setStatusDetail(`Exporting clip ${i + 1}/${numSegments}: ${prefix}_${i + 1}.mp4...`);
        setProgress(0);

        // FFmpeg Log Progress Listener Hook
        const progressListener = await listen<string>("ffmpeg-log", (event) => {
          const message = event.payload;
          const timeMatch = message.match(/time=([0-9:.]+)/);
          if (timeMatch) {
            const timeStr = timeMatch[1];
            const parts = timeStr.split(":");
            let secs = 0;
            if (parts.length === 3) {
              secs = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
            } else {
              secs = parseFloat(timeStr);
            }
            const activeDur = currentSegmentLength + hookDuration;
            const pct = Math.min(100, Math.round((secs / activeDur) * 100));
            setProgress(pct);
          }
        });

        // Build native ffmpeg argument list
        const args: string[] = ["-y"];
        let inputIdx = 0;
        let hookIdx = -1;

        if (selectedHookPath) {
          args.push("-i", selectedHookPath);
          hookIdx = inputIdx++;
        }

        // Main segment input cut
        args.push("-ss", startTime.toFixed(2), "-t", currentSegmentLength.toFixed(2), "-i", videoPath);
        const primaryIdx = inputIdx++;

        let bgIdx = -1;
        if (isGenZSplit && bgVideoPath) {
          args.push("-stream_loop", "-1", "-i", bgVideoPath);
          bgIdx = inputIdx++;
        }

        let bgAudioIdx = -1;
        if (isBgAudioEnabled && bgAudioPath) {
          args.push("-stream_loop", "-1", "-i", bgAudioPath);
          bgAudioIdx = inputIdx++;
        }

        let watermarkIdx = -1;
        if (watermarkPath) {
          args.push("-loop", "1", "-i", watermarkPath);
          watermarkIdx = inputIdx++;
        }

        // Complex filtergraph parameters
        const filterParts: string[] = [];

        // Primary crop/letterbox
        const cropTargetH = isGenZSplit && bgVideoPath ? Math.round(targetH / 2) : targetH;
        const primaryCropW = videoDimensions.width > 0 ? Math.min(videoDimensions.width, Math.round(videoDimensions.height * (targetW / cropTargetH))) : targetW;
        const primaryCropH = videoDimensions.width > 0 ? Math.min(videoDimensions.height, Math.round(videoDimensions.width * (cropTargetH / targetW))) : cropTargetH;
        
        let primaryScaleH = targetH;
        if (isGenZSplit && bgVideoPath) {
          primaryScaleH = Math.round(targetH / 2);
        }
        
        const safePrimaryCropW = primaryCropW % 2 === 0 ? primaryCropW : primaryCropW - 1;
        const safePrimaryCropH = primaryCropH % 2 === 0 ? primaryCropH : primaryCropH - 1;

        // Copyright Bypass settings
        const satShift = 1.03;
        const hueShift = 2.0;
        const speed = 1.03;

        // Compile Hook scaling if present
        if (selectedHookPath) {
          let hookScaleH = targetH;
          if (isGenZSplit && bgVideoPath) {
            hookScaleH = Math.round(targetH / 2);
          }
          filterParts.push(`[${hookIdx}:v]scale=${targetW}:${hookScaleH}:force_original_aspect_ratio=increase,crop=${targetW}:${hookScaleH}[hook_v]`);
          if (hookHasAudio) {
            filterParts.push(`[${hookIdx}:a]anull[hook_a]`);
          } else {
            filterParts.push(`anullsrc=r=44100:cl=stereo:d=${hookDuration}[hook_a]`);
          }
        }

        // Compile Main video sizing
        if ((isReelFormat && aspectRatio !== "original") || (isGenZSplit && bgVideoPath)) {
          let primVF = "";
          if (isGenZSplit && bgVideoPath) {
            primVF = `[${primaryIdx}:v]crop=${safePrimaryCropW}:${safePrimaryCropH},scale=${targetW}:${primaryScaleH}`;
          } else if (framingMode === "crop") {
            primVF = `[${primaryIdx}:v]crop=${safePrimaryCropW}:${safePrimaryCropH},scale=${targetW}:${primaryScaleH}`;
          } else if (framingMode === "letterbox") {
            const zoom = bypassCopyright ? "crop=0.98*iw:0.98*ih," : "";
            primVF = `[${primaryIdx}:v]${zoom}scale=${targetW}:-2,pad=${targetW}:${primaryScaleH}:0:(oh-ih)/2:black`;
          } else {
            const zoom = bypassCopyright ? "crop=0.98*iw:0.98*ih," : "";
            filterParts.push(`[${primaryIdx}:v]${zoom}split=2[v_bg][v_fg]`);
            filterParts.push(`[v_bg]crop=${safePrimaryCropW}:${safePrimaryCropH},scale=${targetW}:${primaryScaleH},boxblur=20:2[bg_blur]`);
            filterParts.push(`[v_fg]scale=${targetW}:-2[fg_scaled]`);
            primVF = `[bg_blur][fg_scaled]overlay=0:(H-h)/2`;
          }
          if (bypassCopyright) {
            primVF += `,hue=h=${hueShift}:s=${satShift},setpts=PTS/${speed}`;
          }
          filterParts.push(`${primVF}[primary_v]`);
        } else {
          let primVF = `[${primaryIdx}:v]`;
          if (bypassCopyright) {
            primVF += `crop=0.98*iw:0.98*ih,hue=h=${hueShift}:s=${satShift},setpts=PTS/${speed}`;
          } else {
            primVF += `null`;
          }
          filterParts.push(`${primVF}[primary_v]`);
        }

        // Primary Audio channel
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

        // Gameplay split
        if (isGenZSplit && bgVideoPath && bgIdx !== -1) {
          const bgCropW = bgVideoDimensions.width > 0 ? Math.min(bgVideoDimensions.width, Math.round(bgVideoDimensions.height * (targetW / (targetH / 2)))) : targetW;
          const bgCropH = bgVideoDimensions.width > 0 ? Math.min(bgVideoDimensions.height, Math.round(bgVideoDimensions.width * ((targetH / 2) / targetW))) : Math.round(targetH / 2);
          const safeBgCropW = bgCropW % 2 === 0 ? bgCropW : bgCropW - 1;
          const safeBgCropH = bgCropH % 2 === 0 ? bgCropH : bgCropH - 1;
          filterParts.push(`[${bgIdx}:v]crop=${safeBgCropW}:${safeBgCropH},scale=${targetW}:${Math.round(targetH / 2)}[bg_v]`);
          filterParts.push(`[primary_v][bg_v]vstack=inputs=2:shortest=1[main_v]`);
        } else {
          filterParts.push(`[primary_v]null[main_v]`);
        }

        // BGM overlays
        if (isBgAudioEnabled && bgAudioPath && bgAudioIdx !== -1) {
          filterParts.push(`[${bgAudioIdx}:a]volume=${bgmVolume}[bgm_a]`);
          filterParts.push(`[primary_a][bgm_a]amix=inputs=2:duration=first[main_a]`);
        } else {
          filterParts.push(`[primary_a]anull[main_a]`);
        }

        // Hook concats
        if (selectedHookPath) {
          filterParts.push(`[hook_v][hook_a][main_v][main_a]concat=n=2:v=1:a=1[pre_composed_v][concat_a]`);
        } else {
          filterParts.push(`[main_v]null[pre_composed_v]`);
        }

        // Watermark scaling & overlay
        let watermarkedStream = "[pre_composed_v]";
        if (watermarkPath && watermarkIdx !== -1) {
          const overlayX = `main_w*${watermarkX / 100}-overlay_w/2`;
          const overlayY = `main_h*${watermarkY / 100}-overlay_h/2`;
          const wmScaleWidth = Math.round(targetW * 0.18);
          filterParts.push(`[${watermarkIdx}:v]scale=${wmScaleWidth}:-1[wm_scaled]`);
          filterParts.push(`[pre_composed_v][wm_scaled]overlay=${overlayX}:${overlayY}:shortest=1[wm_v]`);
          watermarkedStream = "[wm_v]";
        }

        // Burn subtitles using drawtext
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
            
            const separator = (j === 0 && srtVF.startsWith("[")) ? "" : ",";
            srtVF += `${separator}drawtext=fontfile='${fontPath}':text='${escaped}':fontcolor=white:fontsize=h/22:x=(w-text_w)/2:y=h*0.75:borderw=3:bordercolor=black:enable='between(t,${startInClip.toFixed(2)},${endInClip.toFixed(2)})'`;
          }
          filterParts.push(`${srtVF}[subbed_v]`);
          subtitledStream = "[subbed_v]";
        }

        // Static texts
        let finalVideoLabel = subtitledStream;
        if (topText || bottomText) {
          let textVF = `${subtitledStream}`;
          const escapeText = (text: string, clipNum: number) => {
            return text.replace(/{n}/g, clipNum.toString()).replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "'\\''").replace(/,/g, '\\,');
          };
          
          let isFirst = true;
          if (topText) {
            const escaped = escapeText(topText, i + 1);
            const separator = (isFirst && textVF.startsWith("[")) ? "" : ",";
            textVF += `${separator}drawtext=fontfile='${fontPath}':text='${escaped}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h*${topTextY / 100}-text_h/2:borderw=3:bordercolor=black`;
            isFirst = false;
          }
          if (bottomText) {
            const escapedBottom = escapeText(bottomText, i + 1);
            const separator = (isFirst && textVF.startsWith("[")) ? "" : ",";
            textVF += `${separator}drawtext=fontfile='${fontPath}':text='${escapedBottom}':fontcolor=white:fontsize=h/18:x=(w-text_w)/2:y=h*${bottomTextY / 100}-text_h/2:borderw=3:bordercolor=black`;
          }
          filterParts.push(`${textVF}[final_v]`);
          finalVideoLabel = "[final_v]";
        }

        const outV = finalVideoLabel;
        const outA = selectedHookPath ? "[concat_a]" : "[main_a]";

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

        // Run segment processing
        console.log(`Executing native FFmpeg clip ${i + 1}/${numSegments}:`, args);
        try {
          await invoke("run_ffmpeg_command", { args });
        } catch (execErr) {
          progressListener();
          throw execErr;
        }
        progressListener();
      }
      
      alert(`Success! Generated all ${numSegments} clips in:\n${outputDirectory}`);
    } catch (err: any) {
      console.error(err);
      alert(`Processing failed:\n${err.message || String(err)}`);
    } finally {
      setProcessing(false);
      setProgress(0);
      setStatusDetail("");
    }
  };

  const openOutputFolder = () => {
    if (outputDirectory) {
      openPath(outputDirectory);
    }
  };

  const togglePlayback = useCallback(() => {
    const player = videoPlayerRef.current;
    if (!player) return;

    if (player.paused) {
      player.play()
        .then(() => {
          if (blurBgVideoRef.current) {
            blurBgVideoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.error("Playback failed:", err);
        });
    } else {
      player.pause();
      if (blurBgVideoRef.current) {
        blurBgVideoRef.current.pause();
      }
    }
  }, []);

  const formatSize = (path: string) => {
    return path ? path.substring(path.lastIndexOf("/") + 1) : "";
  };

  const formatDisplayTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Generate ticks for time ruler
  const renderRulerTicks = () => {
    if (duration === 0) return null;
    const tickInterval = 5; // seconds
    const totalTicks = Math.ceil(duration / tickInterval);
    const ticks = [];
    for (let i = 0; i <= totalTicks; i++) {
      const time = i * tickInterval;
      if (time > duration) break;
      const pct = (time / duration) * 100;
      ticks.push(
        <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-between" style={{ left: `${pct}%` }}>
          <div className="w-[1px] h-2 bg-border-val/80"></div>
          <span className="text-[8px] font-mono text-text-2 -translate-x-1/2 select-none mb-1">
            {formatDisplayTime(time)}
          </span>
        </div>
      );
    }
    return ticks;
  };

  // Generate segmentation boundaries in the timeline track
  const renderCutBoundaryMarkers = () => {
    if (duration === 0) return null;
    const segmentStarts: number[] = [startOffset];
    const effectiveDuration = duration - startOffset;
    const numNominalSegments = Math.ceil(effectiveDuration / segmentLength);
    
    for (let i = 1; i < numNominalSegments; i++) {
      const nominalStart = startOffset + i * segmentLength;
      segmentStarts.push(nominalStart);
    }

    return segmentStarts.map((cutTime, idx) => {
      const pct = (cutTime / duration) * 100;
      return (
        <div key={idx} className="absolute top-0 bottom-0 z-10 pointer-events-none" style={{ left: `${pct}%` }}>
          <div className="w-[2px] h-full border-l-2 border-dashed border-accent hover:border-yellow transition-all flex flex-col items-center">
            <div className="bg-accent text-white rounded p-0.5 mt-0.5 shadow-lg border border-accent flex items-center justify-center -translate-x-1/2 scale-75">
              <Scissors className="w-2.5 h-2.5" />
            </div>
            <span className="text-[7px] text-accent font-bold px-1 bg-surface border border-accent/20 rounded mt-1 -translate-x-1/2">
              Cut {idx + 1}
            </span>
          </div>
        </div>
      );
    });
  };

  if (checkingFfmpeg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text-1">
        <RefreshCw className="w-10 h-10 text-accent animate-spin mb-4" />
        <p className="text-text-2 font-semibold">Initializing native editor engine...</p>
      </div>
    );
  }

  if (ffmpegInstalled === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text-1 p-8 text-center">
        <div className="max-w-md bg-surface border border-border p-8 rounded-2xl shadow-xl">
          <AlertCircle className="w-16 h-16 text-red mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">FFmpeg Required</h2>
          <p className="text-text-2 text-sm mb-6">
            The native desktop clipper requires **FFmpeg** and **FFprobe** installed on your system.
          </p>
          <div className="bg-surface-2 p-4 rounded-xl border border-border text-left font-mono text-xs mb-6 select-all">
            sudo dnf install ffmpeg
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="w-full py-3 bg-accent hover:bg-accent/90 text-white rounded-xl font-bold transition-all shadow-md"
          >
            Check Status Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-bg overflow-hidden text-text-1 font-body">
      
      {/* Titlebar / Header */}
      <header className="h-10 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 z-50 select-none" data-tauri-drag-region>
        <div className="flex items-center gap-2 pointer-events-none">
          <div className="w-6 h-6 bg-accent rounded flex items-center justify-center text-white">
            <Scissors className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-semibold text-sm tracking-wider bg-gradient-to-r from-text-1 to-text-2 bg-clip-text text-transparent">AUTO CLIPPER PRO</span>
          <span className="text-[10px] bg-accent/10 text-accent font-semibold px-2 py-0.5 rounded border border-accent/20">Linux Native</span>
        </div>
        
        {/* Quick presets */}
        <div className="flex gap-2 items-center">
          <span className="text-xs text-text-2 uppercase font-medium mr-1">Presets:</span>
          <button onClick={() => applyPreset("tiktok")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
            <Smartphone className="w-3.5 h-3.5 text-accent" />
            <span>TikTok</span>
          </button>
          <button onClick={() => applyPreset("shorts")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
            <Smartphone className="w-3.5 h-3.5 text-accent" />
            <span>Shorts</span>
          </button>
          <button onClick={() => applyPreset("fb_li")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
            <Layers className="w-3.5 h-3.5 text-accent" />
            <span>Square</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-2.5rem)]">
        
        {/* Left Column: Preview + Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden bg-bg">
          
          {/* Preview workspace (dominant element, dark matte bg) */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-8 preview-workspace overflow-hidden min-h-[200px]">
            {videoPath ? (
              isReelFormat ? (
                <div 
                  ref={previewRef}
                  onClick={togglePlayback}
                  className={`relative bg-black shadow-2xl border border-white/5 overflow-hidden flex items-center justify-center cursor-pointer transition-all ${
                    aspectRatio === "4:5" ? "aspect-[4/5] h-full max-h-[500px]" : "aspect-[9/16] h-full max-h-[560px]"
                  }`}
                >
                  {/* Gen Z VS Split renderer */}
                  {isGenZSplit && bgVideoPath ? (
                    <div className="w-full h-full flex flex-col">
                      <div className="w-full h-[50%] relative overflow-hidden border-b border-border">
                        <video
                          ref={videoPlayerRef}
                          src={videoSrc || undefined}
                          preload="auto"
                          loop
                          playsInline
                          className="absolute w-full h-full object-cover pointer-events-none"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onError={(e) => console.error("Video error:", e.currentTarget.error)}
                          onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                        />
                      </div>
                      <div className="w-full h-[50%] relative overflow-hidden bg-neutral-950">
                        {bgVideoSrc ? (
                          <video
                            src={bgVideoSrc}
                            muted
                            loop
                            autoPlay
                            playsInline
                            className="absolute w-full h-full object-cover pointer-events-none"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-accent/10 to-accent-glow animate-pulse">
                            <span className="text-[10px] text-text-2 font-bold uppercase tracking-wider z-10 bg-black/70 px-2 py-1 rounded border border-border">Gameplay Video</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // Normal video framing mode
                    <div className="w-full h-full flex items-center justify-center bg-black relative">
                      {framingMode === "blur" ? (
                        <>
                          <video
                            ref={blurBgVideoRef}
                            src={videoSrc || undefined}
                            muted
                            loop
                            preload="auto"
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-105 pointer-events-none"
                          />
                          <video
                            ref={videoPlayerRef}
                            src={videoSrc || undefined}
                            preload="auto"
                            loop
                            playsInline
                            className="relative w-full h-auto object-contain z-10 pointer-events-none"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onError={(e) => console.error("Video error:", e.currentTarget.error)}
                            onTimeUpdate={(e) => {
                              setPreviewTime(e.currentTarget.currentTime);
                              if (blurBgVideoRef.current) {
                                blurBgVideoRef.current.currentTime = e.currentTarget.currentTime;
                              }
                            }}
                          />
                        </>
                      ) : (
                        <video
                          ref={videoPlayerRef}
                          src={videoSrc || undefined}
                          preload="auto"
                          loop
                          playsInline
                          className={`w-full h-full pointer-events-none ${framingMode === "letterbox" ? "object-contain bg-black" : "object-cover"}`}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onError={(e) => console.error("Video error:", e.currentTarget.error)}
                          onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                        />
                      )}
                    </div>
                  )}

                  {/* Watermark Logo drag box */}
                  {watermarkSrc && (
                    <div 
                      onMouseDown={(e) => startDrag(e, "watermark")}
                      onClick={(e) => e.stopPropagation()}
                      style={{ top: `${watermarkY}%`, left: `${watermarkX}%` }}
                      className="absolute z-30 w-10 h-10 -translate-x-1/2 -translate-y-1/2 cursor-move hover:scale-105 active:scale-95 transition-transform"
                      title="Drag brand logo watermark"
                    >
                      <img src={watermarkSrc} className="w-full h-full object-contain pointer-events-none rounded shadow-md border border-white/10 bg-black/40 backdrop-blur-sm p-0.5" alt="Watermark Logo" />
                      <div className="absolute inset-0 border border-accent rounded pointer-events-none opacity-0 hover:opacity-100"></div>
                    </div>
                  )}

                  {/* Header Text Overlay drag box */}
                  {topText && (
                    <div 
                      onMouseDown={(e) => startDrag(e, "top")}
                      onClick={(e) => e.stopPropagation()}
                      style={{ top: `${topTextY}%` }}
                      className="absolute left-1/2 -translate-x-1/2 z-30 cursor-move text-white text-[10px] font-bold uppercase px-2 py-1 rounded border border-white/10 bg-black/80 shadow-md select-none text-center max-w-[85%] truncate active:border-accent"
                      title="Drag top headline text overlay"
                    >
                      {topText.replace(/{n}/g, "1")}
                    </div>
                  )}

                  {/* Footer Text Overlay drag box */}
                  {bottomText && (
                    <div 
                      onMouseDown={(e) => startDrag(e, "bottom")}
                      onClick={(e) => e.stopPropagation()}
                      style={{ top: `${bottomTextY}%` }}
                      className="absolute left-1/2 -translate-x-1/2 z-30 cursor-move text-white text-[10px] font-bold uppercase px-2 py-1 rounded border border-white/10 bg-black/80 shadow-md select-none text-center max-w-[85%] truncate active:border-accent"
                      title="Drag bottom CTA text overlay"
                    >
                      {bottomText.replace(/{n}/g, "1")}
                    </div>
                  )}

                  {/* Live Captions Rendering Simulation */}
                  {subtitlesList.length > 0 && (() => {
                    const currentSub = subtitlesList.find(sub => previewTime >= sub.start && previewTime <= sub.end);
                    if (currentSub) {
                      return (
                        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 w-[85%] text-center text-white text-[10px] font-extrabold bg-black/90 py-1.5 px-3 rounded shadow-md border border-white/5 select-none z-20 pointer-events-none uppercase tracking-wide">
                          {currentSub.text}
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Mobile Safe Zone Mask Grid */}
                  {showSafeZone && (
                    <div className="absolute inset-0 border-y-[56px] border-x-[12px] border-red/20 pointer-events-none z-30 flex items-center justify-center">
                      <div className="text-[8px] text-red/80 font-bold uppercase tracking-wider bg-black/90 px-2 py-0.5 rounded border border-red/20 shadow-sm">
                        Safe Zone
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Landscape player screen
                <div 
                  onClick={togglePlayback}
                  className="relative bg-black rounded border border-border shadow-2xl w-full max-w-2xl aspect-video flex items-center justify-center cursor-pointer"
                >
                  <video 
                    ref={videoPlayerRef}
                    src={videoSrc || undefined}
                    preload="auto"
                    loop 
                    playsInline
                    className="w-full h-full object-contain pointer-events-none"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => console.error("Video error:", e.currentTarget.error)}
                    onTimeUpdate={(e) => setPreviewTime(e.currentTarget.currentTime)}
                  />
                  {watermarkSrc && (
                    <img 
                      src={watermarkSrc} 
                      style={{ top: `${watermarkY}%`, left: `${watermarkX}%` }} 
                      className="absolute z-30 w-8 h-8 object-contain -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
                      alt="Watermark" 
                    />
                  )}
                </div>
              )
            ) : (
              <div className="text-center p-8 bg-surface-2 border border-border rounded max-w-sm flex flex-col items-center shadow-md">
                <Film className="w-10 h-10 text-accent/40 mb-3" />
                <h3 className="font-semibold text-sm text-text-1 mb-1.5">Canvas Preview</h3>
                <p className="text-xs text-text-2 leading-relaxed">
                  Import a video file to activate live preview.
                </p>
              </div>
            )}

            {/* Floating playback controls below the preview */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-2/95 backdrop-blur border border-border py-2 px-4 rounded-full flex items-center gap-4 text-xs shadow-lg z-40">
              <button 
                onClick={togglePlayback} 
                disabled={!videoPath}
                className="p-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent text-white rounded transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              </button>
              
              <div className="flex items-center gap-1 font-mono text-text-2 select-none">
                <span className="font-semibold text-text-1">{formatDisplayTime(previewTime)}</span>
                <span>/</span>
                <span>{formatDisplayTime(duration)}</span>
              </div>

              <div className="h-4 w-[1px] bg-border" />

              {/* Volume controller */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setPreviewVolume(v => v === 0 ? 1 : 0)} 
                  className="p-1 text-text-2 hover:text-text-1 transition-all"
                >
                  {previewVolume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={previewVolume}
                  onChange={(e) => setPreviewVolume(parseFloat(e.target.value))}
                  className="w-16 h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div className="h-4 w-[1px] bg-border" />

              <button 
                onClick={() => setShowSafeZone(!showSafeZone)}
                className={`p-1 rounded transition-all cursor-pointer ${showSafeZone ? "bg-red/10 text-red" : "text-text-2 hover:text-text-1"}`}
                title="Toggle Safe Zone"
              >
                {showSafeZone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Timeline Panel (collapsible) */}
          <div className={`bg-surface flex flex-col overflow-hidden shrink-0 border-t border-border transition-all duration-200 ${timelineCollapsed ? "h-10" : "h-[200px]"}`}>
            {/* Timeline Header */}
            <div className="h-10 border-b border-border bg-surface-2 flex items-center justify-between px-4 text-xs select-none shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                  className="font-display font-bold uppercase tracking-wider text-text-2 hover:text-text-1 flex items-center gap-1 cursor-pointer"
                >
                  {timelineCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>Timeline</span>
                </button>
                {duration > 0 && !timelineCollapsed && (
                  <span className="font-mono bg-surface border border-border text-accent px-2 py-0.5 rounded">
                    {formatDisplayTime(previewTime)} / {formatDisplayTime(duration)}
                  </span>
                )}
              </div>

              {!timelineCollapsed && (
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-3.5 h-3.5 text-text-2" />
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.2"
                    value={timelineZoom}
                    onChange={(e) => setTimelineZoom(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-border rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <ZoomIn className="w-3.5 h-3.5 text-text-2" />
                  <span className="font-mono text-text-2 font-medium w-8 text-right">{Math.round(timelineZoom * 100)}%</span>
                </div>
              )}
            </div>

            {!timelineCollapsed && (
              <div className="flex-1 flex overflow-hidden">
                {/* Left track names headers */}
                <div className="w-[100px] border-r border-border bg-surface-2 flex flex-col select-none shrink-0 font-medium text-[10px] uppercase tracking-wider text-text-2 text-left z-20">
                  <div className="h-7 border-b border-border flex items-center px-2.5 bg-surface-3/30">Ruler</div>
                  <div className="h-9 border-b border-border flex items-center px-2.5 gap-1"><Film className="w-3 h-3 text-accent" /> Video</div>
                  <div className="h-9 border-b border-border flex items-center px-2.5 gap-1"><Sparkles className="w-3 h-3 text-accent" /> Subs</div>
                  <div className="h-9 border-b border-border flex items-center px-2.5 gap-1"><Music className="w-3 h-3 text-accent" /> Music</div>
                  <div className="h-9 flex items-center px-2.5 gap-1"><Smartphone className="w-3 h-3 text-accent" /> Game</div>
                </div>

                {/* Right tracks content */}
                <div ref={timelineContainerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative timeline-grid" id="timeline-scroll-track">
                  <div 
                    className="relative h-full select-none" 
                    style={{ width: `${100 * timelineZoom}%`, minWidth: "100%" }}
                    onMouseDown={handleTimelineScrub}
                  >
                    <div className="h-7 border-b border-border relative bg-surface-3/10 pointer-events-none select-none">
                      {renderRulerTicks()}
                    </div>

                    <div className="h-9 border-b border-border relative bg-surface-2/5 flex items-center px-1">
                      {duration > 0 && (
                        <div className="w-full h-6 rounded bg-accent/10 border border-accent/20 flex items-center justify-between px-2 text-[10px] font-medium text-accent overflow-hidden">
                          <span className="truncate">{formatSize(videoPath)}</span>
                          {isHookEnabled && hookPaths.length > 0 && (
                            <span className="bg-yellow text-neutral-950 px-1 py-0.5 rounded text-[8px] font-bold uppercase">
                              Hook
                            </span>
                          )}
                        </div>
                      )}
                      {renderCutBoundaryMarkers()}
                    </div>

                    <div className="h-9 border-b border-border relative bg-surface-2/5 flex items-center">
                      {duration > 0 && subtitlesList.map((sub, idx) => {
                        const leftPct = (sub.start / duration) * 100;
                        const widthPct = ((sub.end - sub.start) / duration) * 100;
                        const isCurrent = previewTime >= sub.start && previewTime <= sub.end;
                        
                        return (
                          <div 
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              seekToTime(sub.start);
                            }}
                            className={`absolute h-6 px-1.5 rounded text-[9px] font-medium flex items-center justify-center truncate cursor-pointer transition-all border select-none ${
                              isCurrent 
                                ? "bg-accent border-accent text-white shadow" 
                                : "bg-surface-3 border-border hover:border-accent text-text-2 hover:text-text-1"
                            }`}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: "10px" }}
                            title={`Subtitle: "${sub.text}" (Click to seek)`}
                          >
                            {sub.text}
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-9 border-b border-border relative bg-surface-2/5 flex items-center">
                      {isBgAudioEnabled && bgAudioPath && duration > 0 && (
                        <div className="w-full h-6 rounded bg-yellow/10 border border-yellow/20 text-yellow text-[10px] font-medium flex items-center px-2 gap-1 overflow-hidden">
                          <Music className="w-3.5 h-3.5" />
                          <span className="truncate">BGM: {formatSize(bgAudioPath)}</span>
                        </div>
                      )}
                    </div>

                    <div className="h-9 relative bg-surface-2/5 flex items-center">
                      {isGenZSplit && bgVideoPath && duration > 0 && (
                        <div className="w-full h-6 rounded bg-green/10 border border-green/20 text-green text-[10px] font-medium flex items-center px-2 gap-1 overflow-hidden">
                          <Smartphone className="w-3.5 h-3.5" />
                          <span className="truncate">Split: {formatSize(bgVideoPath)}</span>
                        </div>
                      )}
                    </div>

                    {/* Playhead */}
                    {duration > 0 && (
                      <div 
                        className="absolute top-0 bottom-0 w-[1.5px] bg-red z-30 pointer-events-none flex flex-col items-center"
                        style={{ left: `${(previewTime / duration) * 100}%` }}
                      >
                        <div className="w-2 h-2 bg-red rotate-45 -translate-y-1 border-t border-l border-red/40"></div>
                        <div className="w-[1px] h-full bg-red/80"></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Sidebar */}
        <div className="w-[360px] shrink-0 border-l border-border bg-surface flex flex-col h-full overflow-hidden select-none">
          {/* 1. Media Library Panel (Collapsible) */}
          <div className="border-b border-border bg-surface-2 shrink-0">
            <button 
              onClick={() => setAssetsCollapsed(!assetsCollapsed)}
              className="w-full p-3 flex justify-between items-center text-[10px] font-bold text-text-1 hover:bg-surface-3/50 transition-all uppercase tracking-wider cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Film className="w-4 h-4 text-accent" />
                <span>Media Library</span>
                <span className="text-[9px] bg-border px-1.5 py-0.5 rounded font-mono text-text-2">
                  {[videoPath, bgVideoPath, bgAudioPath, watermarkPath, srtPath].filter(Boolean).length} Active
                </span>
              </span>
              {assetsCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-text-2" /> : <ChevronUp className="w-3.5 h-3.5 text-text-2" />}
            </button>

            {!assetsCollapsed && (
              <div className="p-3 bg-surface/40 border-t border-border space-y-2 max-h-[200px] overflow-y-auto">
                {/* 1. Primary Source Video */}
                <div className={`p-2 border rounded transition-all ${videoPath ? "bg-surface-2 border-accent/20" : "bg-surface-3/30 border-dashed border-border"}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide flex items-center gap-1.5">
                      <FileVideo className="w-3.5 h-3.5 text-accent" />
                      <span>Primary Video</span>
                    </span>
                    <div className={`w-2 h-2 rounded-full ${videoPath ? "bg-green" : "bg-red"}`}></div>
                  </div>
                  {videoPath ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-medium truncate text-text-1">{formatSize(videoPath)}</div>
                      <button onClick={selectMainVideo} className="w-full py-1 bg-surface-3 hover:bg-border text-[9px] font-semibold rounded text-center transition-all border border-border cursor-pointer">
                        Replace File
                      </button>
                    </div>
                  ) : (
                    <button onClick={selectMainVideo} className="w-full py-3 bg-accent/5 hover:bg-accent/15 border border-dashed border-accent/10 hover:border-accent/30 text-accent rounded text-[10px] font-medium transition-all flex flex-col items-center justify-center gap-1 cursor-pointer">
                      <UploadCloud className="w-4 h-4" />
                      <span>Import Main Video</span>
                    </button>
                  )}
                </div>

                {/* 2. Gen Z Split Gameplay */}
                <div className={`p-2 border rounded transition-all ${isGenZSplit && bgVideoPath ? "bg-surface-2 border-green/20" : "bg-surface-3/30 border-border opacity-75"}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-green" />
                      <span>VS Game Video</span>
                    </span>
                    <input 
                      type="checkbox" 
                      checked={isGenZSplit} 
                      onChange={(e) => setIsGenZSplit(e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer rounded"
                    />
                  </div>
                  {isGenZSplit && (
                    bgVideoPath ? (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-medium truncate text-text-1">{formatSize(bgVideoPath)}</div>
                        <button onClick={selectBgVideoFile} className="w-full py-1 bg-surface-3 hover:bg-border text-[9px] font-semibold rounded text-center transition-all border border-border cursor-pointer">
                          Change Game Clip
                        </button>
                      </div>
                    ) : (
                      <button onClick={selectBgVideoFile} className="w-full py-2 bg-green/5 hover:bg-green/15 border border-dashed border-green/10 text-green rounded text-[9px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Game Video</span>
                      </button>
                    )
                  )}
                </div>

                {/* 3. BGM Background Audio */}
                <div className={`p-2 border rounded transition-all ${isBgAudioEnabled && bgAudioPath ? "bg-surface-2 border-yellow/20" : "bg-surface-3/30 border-border opacity-75"}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-yellow" />
                      <span>Backing Music</span>
                    </span>
                    <input 
                      type="checkbox" 
                      checked={isBgAudioEnabled} 
                      onChange={(e) => setIsBgAudioEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 accent-accent cursor-pointer rounded"
                    />
                  </div>
                  {isBgAudioEnabled && (
                    bgAudioPath ? (
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-medium truncate text-text-1">{formatSize(bgAudioPath)}</div>
                        <button onClick={selectBgAudioFile} className="w-full py-1 bg-surface-3 hover:bg-border text-[9px] font-semibold rounded text-center transition-all border border-border cursor-pointer">
                          Replace Music
                        </button>
                      </div>
                    ) : (
                      <button onClick={selectBgAudioFile} className="w-full py-2 bg-yellow/5 hover:bg-yellow/15 border border-dashed border-yellow/10 text-yellow rounded text-[9px] font-medium transition-all flex items-center justify-center gap-1 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Select Audio File</span>
                      </button>
                    )
                  )}
                </div>

                {/* 4. Watermark Image Logo */}
                <div className={`p-2 border rounded transition-all ${watermarkPath ? "bg-surface-2 border-purple-500/20" : "bg-surface-3/30 border-dashed border-border"}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Brand Logo</span>
                    </span>
                    {watermarkPath && (
                      <button onClick={() => { setWatermarkPath(""); setWatermarkSrc(""); }} className="text-red hover:underline text-[9px] font-semibold cursor-pointer">
                        Remove
                      </button>
                    )}
                  </div>
                  {watermarkPath ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-medium truncate text-text-1">{formatSize(watermarkPath)}</div>
                      <button onClick={selectWatermarkImage} className="w-full py-1 bg-surface-3 hover:bg-border text-[9px] font-semibold rounded text-center transition-all border border-border cursor-pointer">
                        Replace Logo
                      </button>
                    </div>
                  ) : (
                    <button onClick={selectWatermarkImage} className="w-full py-2 bg-surface-3 hover:bg-border border border-border text-[9px] font-medium rounded transition-all flex items-center justify-center gap-1 cursor-pointer">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </button>
                  )}
                </div>

                {/* 5. Subtitle Track */}
                <div className={`p-2 border rounded transition-all ${subtitlesList.length > 0 ? "bg-surface-2 border-accent/20" : "bg-surface-3/30 border-dashed border-border"}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>Subtitles</span>
                    </span>
                    {subtitlesList.length > 0 && (
                      <button onClick={() => setSubtitlesList([])} className="text-red hover:underline text-[9px] font-semibold cursor-pointer">
                        Clear
                      </button>
                    )}
                  </div>
                  {subtitlesList.length > 0 ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-medium text-text-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green" />
                        <span>{subtitlesList.length} blocks loaded</span>
                      </div>
                      <button onClick={selectSrtSubtitle} className="w-full py-1 bg-surface-3 hover:bg-border text-[9px] font-semibold rounded text-center transition-all border border-border cursor-pointer">
                        Replace SRT
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={selectSrtSubtitle} className="flex-1 py-1.5 bg-surface-3 hover:bg-border border border-border text-[9px] font-medium rounded transition-all cursor-pointer">
                        Load SRT
                      </button>
                      <button onClick={generateCaptions} className="flex-1 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/10 text-accent text-[9px] font-medium rounded transition-all cursor-pointer">
                        Transcribe
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Tabs header selector */}
          <div className="flex border-b border-border bg-surface-2 text-[10px] font-bold tracking-wider uppercase shrink-0">
            {[
              { id: "sizing", label: "Format", icon: Sliders },
              { id: "overlays", label: "Text", icon: Layers },
              { id: "audio", label: "Mixer", icon: Music },
              { id: "captions", label: "Speech", icon: Sparkles },
              { id: "advanced", label: "Rules", icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 text-center border-b-2 flex flex-col items-center gap-1 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? "border-accent text-accent bg-surface"
                      : "border-transparent text-text-2 hover:text-text-1 hover:bg-surface/30"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3. Scrollable Inspector Tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-full text-xs">
            {/* Inspector 1: Format & Crop */}
            {activeTab === "sizing" && (
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Aspect Canvas Output</h4>
                  <div className="flex gap-1.5">
                    {["9:16", "4:5", "original"].map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => {
                          setAspectRatio(ratio as any);
                          setIsReelFormat(ratio !== "original");
                        }}
                        className={`flex-1 py-2 text-center rounded font-semibold border transition-all text-xs cursor-pointer ${
                          aspectRatio === ratio
                            ? "bg-accent border-accent text-white"
                            : "bg-surface-3 border-border text-text-2 hover:border-accent/30"
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {isReelFormat && (
                  <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                    <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Canvas Fill Framing</h4>
                    <div className="flex gap-1.5">
                      {[
                        { id: "crop", label: "Crop Center" },
                        { id: "letterbox", label: "Letterbox" },
                        { id: "blur", label: "Blurred BG" }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setFramingMode(mode.id as any)}
                          className={`flex-1 py-2 text-center rounded font-semibold border transition-all text-xs cursor-pointer ${
                            framingMode === mode.id
                              ? "bg-accent border-accent text-white"
                              : "bg-surface-3 border-border text-text-2 hover:border-accent/30"
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Export Resolution</h4>
                   <div className="flex gap-1.5">
                    {["360p", "480p", "720p", "1080p"].map((res) => (
                      <button
                        key={res}
                        onClick={() => setExportResolution(res as any)}
                        className={`flex-1 py-2 text-center rounded font-semibold border transition-all text-xs cursor-pointer ${
                          exportResolution === res
                            ? "bg-accent border-accent text-white"
                            : "bg-surface-3 border-border text-text-2 hover:border-accent/30"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Inspector 2: Overlays, Watermarks & CTA */}
            {activeTab === "overlays" && (
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Dynamic Title Overlays</h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-text-2 mb-1 font-medium text-[10px]">Top Header Text (use {"{n}"} for part #)</label>
                      <input
                        type="text"
                        value={topText}
                        onChange={(e) => setTopText(e.target.value)}
                        placeholder="e.g. PART {n} - WAIT FOR END..."
                        className="w-full bg-surface-3 border border-border rounded p-2 text-text-1 focus:border-accent outline-none text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-text-2 mb-1 font-medium text-[10px]">Bottom Call-To-Action (CTA)</label>
                      <input
                        type="text"
                        value={bottomText}
                        onChange={(e) => setBottomText(e.target.value)}
                        placeholder="e.g. SUBSCRIBE FOR MORE!"
                        className="w-full bg-surface-3 border border-border rounded p-2 text-text-1 focus:border-accent outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Overlay Position (Y-Axis)</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-text-2 mb-0.5">
                        <span>Top Header Height</span>
                        <span className="font-mono">{topTextY}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="2" 
                        max="50" 
                        value={topTextY} 
                        onChange={(e) => setTopTextY(parseInt(e.target.value))} 
                        className="w-full accent-accent"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-text-2 mb-0.5">
                        <span>Bottom Footer Height</span>
                        <span className="font-mono">{bottomTextY}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="50" 
                        max="98" 
                        value={bottomTextY} 
                        onChange={(e) => setBottomTextY(parseInt(e.target.value))} 
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-text-2 leading-relaxed italic border-t border-border pt-1.5 mt-1 select-none">
                    Tip: You can drag headers directly inside the preview canvas.
                  </p>
                </div>
              </div>
            )}

            {/* Inspector 3: Audio mixer */}
            {activeTab === "audio" && (
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Track Mixing Volume</h4>
                  
                  <div className="flex items-center justify-between p-2 bg-surface-3 rounded border border-border">
                    <span className="font-medium text-text-2 text-[10px]">Primary Video Audio</span>
                    <span className={`font-bold uppercase text-[9px] px-2 py-0.5 rounded ${primaryHasAudio ? "bg-green/10 text-green border border-green/20" : "bg-red/10 text-red border border-red/20"}`}>
                      {primaryHasAudio ? "Detected" : "Muted"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-surface-3 rounded border border-border">
                    <span className="font-medium text-text-2 text-[10px]">Background Music Mix</span>
                    <input
                      type="checkbox"
                      checked={isBgAudioEnabled}
                      onChange={(e) => setIsBgAudioEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
                    />
                  </div>

                  {isBgAudioEnabled && (
                    <div className="space-y-2 pt-1.5 animate-fadeIn">
                      <div>
                        <label className="block text-text-2 mb-1 font-medium text-[10px]">Backing Music File</label>
                        <button 
                          onClick={selectBgAudioFile}
                          className="w-full py-2 bg-surface-3 hover:bg-border border border-border rounded font-semibold text-text-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer"
                        >
                          <Music className="w-3.5 h-3.5 text-accent" />
                          {bgAudioPath ? "Change Audio File" : "Select Music Track"}
                        </button>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-0.5 text-[10px] text-text-2 font-medium">
                          <span>BGM Volume Mix</span>
                          <span className="font-mono">{Math.round(bgmVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.5"
                          step="0.01"
                          value={bgmVolume}
                          onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                          className="w-full accent-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inspector 4: Auto-captions & Whisper Speech */}
            {activeTab === "captions" && (
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">AI Local Transcription</h4>
                  <p className="text-[10px] text-text-2 leading-relaxed select-none">
                    Convert video speech into text segments using local machine learning (Whisper). Zero cloud APIs used.
                  </p>
                  <button
                    onClick={generateCaptions}
                    disabled={isTranscribing || !videoPath}
                    className="w-full py-2 bg-accent hover:bg-accent/90 disabled:bg-accent/30 text-white rounded font-bold transition-all shadow-md flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    {isTranscribing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>{isTranscribing ? "Transcribing..." : "Auto-Transcribe Speech"}</span>
                  </button>

                  {isTranscribing && (
                    <div className="bg-surface-3 p-2.5 rounded border border-border space-y-1.5">
                      <p className="text-[9px] text-text-2 font-medium truncate">{transcriptionStatus}</p>
                      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
                        <div style={{ width: `${transcriptionProgress}%` }} className="h-full bg-accent transition-all duration-300"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Upload Subtitles File</h4>
                  <button 
                    onClick={selectSrtSubtitle}
                    className="w-full py-2 bg-surface-3 hover:bg-border border border-border rounded font-semibold text-text-1 flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-accent" />
                    {srtPath ? "Replace SRT Subtitles" : "Browse SRT File"}
                  </button>
                </div>
              </div>
            )}

            {/* Inspector 5: Pro Rules & Advanced settings */}
            {activeTab === "advanced" && (
              <div className="space-y-3">
                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Viral Video Rule Hooks</h4>
                  
                  <div className="flex items-center justify-between p-2 bg-surface-3 rounded border border-border">
                    <span className="font-medium text-text-2 text-[10px]">Intro Hook Clip</span>
                    <input
                      type="checkbox"
                      checked={isHookEnabled}
                      onChange={(e) => setIsHookEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
                    />
                  </div>

                  {isHookEnabled && (
                    <div className="space-y-2 pt-1 animate-fadeIn">
                      <button 
                        onClick={addHookFile}
                        className="w-full py-2 bg-surface-3 hover:bg-border border border-border rounded font-semibold text-text-1 flex items-center justify-center gap-1 text-[10px] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-accent" />
                        Add Hook Segment
                      </button>
                      {hookPaths.map((path, idx) => (
                        <div key={idx} className="bg-surface-3 border border-border p-2 rounded flex justify-between items-center text-[10px]">
                          <span className="font-mono text-text-2 truncate max-w-[80%]">{formatSize(path)}</span>
                          <button onClick={() => removeHookFile(idx)} className="text-red hover:text-red/80 font-bold cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-surface-2 border border-border p-3 rounded space-y-2">
                  <h4 className="font-semibold text-text-1 uppercase tracking-wider text-[10px]">Advanced Filters</h4>
                  
                  <div className="flex items-center justify-between p-2 bg-surface-3 rounded border border-border">
                    <span className="font-medium text-text-2 text-[10px]">Anti-Copyright Filters</span>
                    <input
                      type="checkbox"
                      checked={bypassCopyright}
                      onChange={(e) => setBypassCopyright(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-surface-3 rounded border border-border">
                    <span className="font-medium text-text-2 text-[10px]">Scene Transition Cut</span>
                    <input
                      type="checkbox"
                      checked={useSceneCut}
                      onChange={(e) => setUseSceneCut(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-accent cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-text-2 mb-1 font-medium text-[10px]">Trim Video Start Offset (seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={startOffset}
                        onChange={(e) => setStartOffset(parseFloat(e.target.value) || 0)}
                        className="w-full bg-surface-3 border border-border rounded p-2 text-text-1 focus:border-accent outline-none font-mono text-[10px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. Export Pinned Controls (Bottom of sidebar) */}
          <div className="p-3 border-t border-border bg-surface-2 shrink-0 space-y-2 z-40">
            {/* Target Output directory picker */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] uppercase font-bold text-text-2 select-none">
                <span>Output Destination</span>
                {outputDirectory && <span className="text-green font-semibold">Ready</span>}
              </div>
              <button 
                onClick={selectOutputDir}
                className="w-full py-2 bg-surface hover:bg-surface-3 border border-border rounded font-bold text-text-1 flex items-center justify-center gap-1.5 transition-all text-[10px] cursor-pointer shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5 text-accent" />
                <span>{outputDirectory ? "Change Folder" : "Select Output Folder"}</span>
              </button>
              {outputDirectory && (
                <p className="bg-surface border border-border p-1.5 rounded font-mono text-[9px] text-text-2 truncate select-all">{outputDirectory}</p>
              )}
            </div>

            {/* Split Settings */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-text-2 mb-1 select-none">Split Limit (min)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={segmentLengthMinutes}
                  onChange={(e) => setSegmentLengthMinutes(parseFloat(e.target.value) || 1)}
                  className="w-full bg-surface border border-border rounded p-1.5 text-text-1 focus:border-accent outline-none font-mono font-bold text-center text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-text-2 mb-1 select-none">Prefix name</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  className="w-full bg-surface border border-border rounded p-1.5 text-text-1 focus:border-accent outline-none font-mono font-bold text-center text-xs"
                />
              </div>
            </div>

            {/* Processing Export Button / Progress block */}
            {processing ? (
              <div className="bg-surface border border-border rounded p-2.5 space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-text-1 font-semibold flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 text-accent animate-spin" />
                    <span>Clip {currentClip} / {totalClips}</span>
                  </span>
                  <span className="font-mono text-accent font-bold">{progress}%</span>
                </div>
                
                <div className="w-full h-1 bg-surface-2 rounded-full overflow-hidden border border-border">
                  <div style={{ width: `${progress}%` }} className="h-full bg-accent transition-all duration-300"></div>
                </div>
                
                <p className="text-[9px] text-text-2 truncate font-semibold">{statusDetail}</p>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={handleSplit}
                  disabled={!videoPath || !outputDirectory}
                  className="flex-1 py-2.5 bg-accent hover:bg-accent-hover disabled:bg-accent/20 disabled:cursor-not-allowed text-white rounded font-bold shadow transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Export Clips</span>
                </button>
                {outputDirectory && (
                  <button 
                    onClick={openOutputFolder}
                    className="px-2.5 bg-surface hover:bg-surface-3 border border-border rounded text-text-1 font-bold shadow hover:scale-102 active:scale-98 transition-all flex items-center justify-center cursor-pointer"
                    title="Open Output Folder"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-accent" />
                  </button>
                )}
              </div>
            )}

            {/* Collapsible Console Log Logger terminal */}
            <div className="border border-border rounded bg-surface overflow-hidden">
              <button 
                onClick={() => setShowConsole(!showConsole)}
                className="w-full py-1.5 px-2.5 flex justify-between items-center text-[9px] font-bold text-text-2 hover:bg-surface-2 transition-all uppercase tracking-wider cursor-pointer select-none"
              >
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-accent" />
                  <span>FFmpeg Terminal logs</span>
                </span>
                {showConsole ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showConsole && (
                <div className="h-24 bg-black/95 text-green-500 font-mono text-[9px] p-2 overflow-y-auto space-y-0.5 border-t border-border select-text">
                  {ffmpegLogs.length > 0 ? (
                    ffmpegLogs.map((log, idx) => (
                      <div key={idx} className="truncate">{log}</div>
                    ))
                  ) : (
                    <div className="text-neutral-500 italic">No ffmpeg subprocess active. Output will stream here.</div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}