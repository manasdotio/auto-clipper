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
  Smartphone,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Music,
  Volume2,
  VolumeX,
  Image as ImageIcon,
  Layers,
  Film,
  Play,
  Pause,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Trash2,
  Plus,
  Terminal
} from "lucide-react";
import "./App.css";

interface Subtitle {
  start: number;
  end: number;
  text: string;
}

export default function App() {
  const [showHelpTooltips, setShowHelpTooltips] = useState<boolean>(true);

  useEffect(() => {
    const val = localStorage.getItem("showHelpTooltips");
    if (val !== null) {
      setShowHelpTooltips(val === "true");
    }
  }, []);

  const handleToggleHelpTooltips = (enabled: boolean) => {
    setShowHelpTooltips(enabled);
    localStorage.setItem("showHelpTooltips", String(enabled));
  };

  const tooltip = (text: string) => showHelpTooltips ? text : undefined;

  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check local storage or system preference
    const isLight = localStorage.getItem("theme") === "light" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: light)").matches);
    
    if (isLight) {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      setTheme("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const [ffmpegInstalled, setFfmpegInstalled] = useState<boolean | null>(null);
  const [checkingFfmpeg, setCheckingFfmpeg] = useState(true);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const blurBgVideoRef = useRef<HTMLVideoElement>(null);
  const bgAudioPlayerRef = useRef<HTMLAudioElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<string[]>([]);
  const isScrubbingRef = useRef(false);
  const [bgAudioSrc, setBgAudioSrc] = useState<string>("");
  
  
  // Navigation & Interactive Tabs
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [previewVolume, setPreviewVolume] = useState<number>(1); // 0 to 1
  const [timelineCollapsed, setTimelineCollapsed] = useState(false);

  // File Paths on Host Disk
  const [videoPath, setVideoPath] = useState<string>("");
  const [bulkVideoPaths, setBulkVideoPaths] = useState<string[]>([]);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [duration, setDuration] = useState<number>(0);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [bgVideoDimensions, setBgVideoDimensions] = useState({ width: 0, height: 0 });
  const [segmentLengthMinutes, setSegmentLengthMinutes] = useState<number>(1);
  const [prefix, setPrefix] = useState<string>("part");
  const [outputDirectory, setOutputDirectory] = useState<string>("");
  
  // Sizing & Export
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "4:5" | "original">("9:16");
  const [framingMode, setFramingMode] = useState<"crop" | "letterbox" | "blur">("crop");
  const [isReelFormat, setIsReelFormat] = useState(true);
  const [exportResolution, setExportResolution] = useState<"360p" | "480p" | "720p" | "1080p">("1080p");
  
  // Subtitles
  const [subtitlesList] = useState<Subtitle[]>([]);
  
  // Overlays & Safe Zone
  const [watermarkPath, setWatermarkPath] = useState<string>("");
  const [watermarkSrc, setWatermarkSrc] = useState<string>("");
  const [watermarkPosition, setWatermarkPosition] = useState<"topLeft" | "topRight" | "bottomLeft" | "bottomRight">("topRight");
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [safeZoneRatio, setSafeZoneRatio] = useState<"9:16" | "4:5">("9:16");

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
  const [bgAudioMode, setBgAudioMode] = useState<"mix" | "bgm_only">("mix");
  
  const [bypassCopyright, setBypassCopyright] = useState(false);
  const [metadataScrubbing, setMetadataScrubbing] = useState<boolean>(true);
  const [audioShift, setAudioShift] = useState<boolean>(true);
  const [antiCopyrightSpeed, setAntiCopyrightSpeed] = useState<number>(1.03);
  const [inspectorTab, setInspectorTab] = useState<"layout" | "viral" | "stealth" | "export">("layout");
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [isStealthExpanded, setIsStealthExpanded] = useState<boolean>(true);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [endOffset, setEndOffset] = useState<number>(0);
  const [useSceneCut, setUseSceneCut] = useState<boolean>(false);

  // Processing Progress States
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClip, setCurrentClip] = useState(0);
  const [totalClips, setTotalClips] = useState(0);
  const [statusDetail, setStatusDetail] = useState("");
  const [ffmpegLogs, setFfmpegLogs] = useState<string[]>([]);

  const [previewTime, setPreviewTime] = useState<number>(0);
  const previewTimeRef = useRef<number>(0);

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

  // Initialize video in paused state when a new source is loaded
  useEffect(() => {
    if (!videoSrc) return;
    const player = videoPlayerRef.current;
    if (!player) return;

    player.load();
    setIsPlaying(false);
    if (blurBgVideoRef.current) {
      blurBgVideoRef.current.load();
    }
  }, [videoSrc]);

  // Synchronize Blur Background Video playback with main video player state
  useEffect(() => {
    const blurPlayer = blurBgVideoRef.current;
    if (!blurPlayer) return;

    if (isPlaying) {
      blurPlayer.play().catch((err) => console.warn("Blur video autoplay failed:", err));
    } else {
      blurPlayer.pause();
    }
  }, [isPlaying]);

  // Synchronize BGM playback with video player state
  useEffect(() => {
    const bgAudio = bgAudioPlayerRef.current;
    if (!bgAudio) return;

    if (isPlaying && isBgAudioEnabled && bgAudioSrc) {
      bgAudio.volume = bgmVolume;
      bgAudio.play().catch((err) => console.warn("BGM autoplay failed:", err));
    } else {
      bgAudio.pause();
    }
  }, [isPlaying, isBgAudioEnabled, bgAudioSrc, bgmVolume]);

  const togglePlayback = useCallback(() => {
    const player = videoPlayerRef.current;
    if (!player) return;

    if (player.paused) {
      if (player.currentTime < startOffset) {
        player.currentTime = startOffset;
        if (blurBgVideoRef.current) {
          blurBgVideoRef.current.currentTime = startOffset;
        }
        if (bgAudioPlayerRef.current) {
          try {
            bgAudioPlayerRef.current.currentTime = startOffset;
          } catch (e) {}
        }
      }
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
  }, [startOffset]);

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
        seekToTime(Math.max(0, previewTimeRef.current - (e.shiftKey ? 5 : 1)));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        seekToTime(Math.min(duration, previewTimeRef.current + (e.shiftKey ? 5 : 1)));
      } else if (e.code === "KeyS") {
        e.preventDefault();
        setShowSafeZone(prev => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration, isPlaying, togglePlayback]);

  // Native File Picker functions
  const selectMainVideo = async () => {
    try {
      const path = await invoke<string | null>("select_video_file");
      if (path) {
        setVideoPath(path);
        setBulkVideoPaths([]); // Clear bulk videos if a single one is picked
        const url = await invoke<string>("get_video_url", { path });
        setVideoSrc(url);
        setStatusDetail("Querying video details...");
        
        const dur = await invoke<number>("get_video_duration", { path });
        setDuration(dur);
        
        const dims = await invoke<[number, number]>("get_video_dimensions", { path });
        setVideoDimensions({ width: dims[0], height: dims[1] });
        
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

  const selectMainVideos = async () => {
    try {
      const paths = await invoke<string[] | null>("select_video_files");
      if (paths && paths.length > 0) {
        setBulkVideoPaths(paths);
        const path = paths[0];
        setVideoPath(path);
        const url = await invoke<string>("get_video_url", { path });
        setVideoSrc(url);
        setStatusDetail("Querying video details...");
        
        const dur = await invoke<number>("get_video_duration", { path });
        setDuration(dur);
        
        const dims = await invoke<[number, number]>("get_video_dimensions", { path });
        setVideoDimensions({ width: dims[0], height: dims[1] });
        
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

  const downloadPreset = async (presetName: string, url: string) => {
    try {
      setStatusDetail(`Downloading preset "${presetName}"...`);
      setProgress(0);
      
      const tempDir = await invoke<string>("get_temp_directory");
      const localPath = `${tempDir}/clipper_preset_${presetName.toLowerCase().replace(/\s+/g, "_")}.mp4`;
      
      // Check if file already exists
      const exists = await invoke<boolean>("check_file_exists", { path: localPath });
      if (exists) {
        setBgVideoPath(localPath);
        const urlLocal = await invoke<string>("get_video_url", { path: localPath });
        setBgVideoSrc(urlLocal);
        const dims = await invoke<[number, number]>("get_video_dimensions", { path: localPath });
        setBgVideoDimensions({ width: dims[0], height: dims[1] });
        setStatusDetail(`Preset "${presetName}" loaded from cache!`);
        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
        return;
      }
      
      // Fetch from remote
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
      
      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') || '0');
      let receivedLength = 0;
      const chunks: any[] = [];
      
      if (reader) {
        while(true) {
          const {done, value} = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedLength += value.length;
          if (contentLength > 0) {
            setProgress(Math.round((receivedLength / contentLength) * 100));
          }
        }
      }
      
      const blob = new Blob(chunks);
      const arrayBuffer = await blob.arrayBuffer();
      const u8Array = new Uint8Array(arrayBuffer);
      
      setStatusDetail(`Saving preset "${presetName}" to local disk...`);
      await invoke("write_binary_file", { path: localPath, data: Array.from(u8Array) });
      
      setBgVideoPath(localPath);
      const urlLocal = await invoke<string>("get_video_url", { path: localPath });
      setBgVideoSrc(urlLocal);
      const dims = await invoke<[number, number]>("get_video_dimensions", { path: localPath });
      setBgVideoDimensions({ width: dims[0], height: dims[1] });
      
      setStatusDetail(`Preset "${presetName}" successfully downloaded!`);
      setProgress(100);
      setTimeout(() => setProgress(0), 1000);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to download preset: ${err.message || String(err)}`);
    } finally {
      setStatusDetail("");
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
      const url = await invoke<string>("get_video_url", { path });
      setBgAudioSrc(url);
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
    const scrollLeft = track.scrollLeft;
    const scrollWidth = track.scrollWidth;
    const relativeX = e.clientX - rect.left + scrollLeft;
    const percentage = Math.max(0, Math.min(1, relativeX / scrollWidth));
    const seekTime = percentage * duration;

    seekToTime(seekTime);
  };

  const seekToTime = (time: number) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = time;
      if (blurBgVideoRef.current) {
        blurBgVideoRef.current.currentTime = time;
      }
      if (bgAudioPlayerRef.current) {
        try {
          bgAudioPlayerRef.current.currentTime = time;
        } catch (e) {
          console.warn("BGM seek failed:", e);
        }
      }
      previewTimeRef.current = time;
      handleTimeUpdate(time);
      setPreviewTime(time);
    }
  };

  const handleTimeUpdate = (currentTime: number) => {
    previewTimeRef.current = currentTime;
    
    // Loop back to startOffset if we reach or exceed the active duration end boundary during playback
    if (duration > 0 && !isScrubbingRef.current && videoPlayerRef.current && !videoPlayerRef.current.paused) {
      const maxTime = duration - endOffset;
      if (currentTime >= maxTime || currentTime < startOffset) {
        seekToTime(startOffset);
        return;
      }
    }
    
    // 1. Update playhead position directly
    const playhead = document.getElementById("timeline-playhead");
    if (playhead && duration > 0) {
      playhead.style.left = `${(currentTime / duration) * 100}%`;
    }
    
    // 2. Update display time text directly in floating controls
    const previewTimeDisplay = document.getElementById("preview-current-time");
    if (previewTimeDisplay) {
      previewTimeDisplay.textContent = formatDisplayTime(currentTime);
    }
    
    // 3. Update timeline track time text directly
    const timelineTimeDisplay = document.getElementById("timeline-current-time");
    if (timelineTimeDisplay) {
      timelineTimeDisplay.textContent = `${formatDisplayTime(currentTime)} / ${formatDisplayTime(duration)}`;
    }
  };

  // MAIN SPLITTING COMMAND
  const handleSplit = async () => {
    const pathsToProcess = bulkVideoPaths.length > 0 ? bulkVideoPaths : (videoPath ? [videoPath] : []);
    if (pathsToProcess.length === 0 || !outputDirectory) {
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

      for (let fileIdx = 0; fileIdx < pathsToProcess.length; fileIdx++) {
        const currentVideoPath = pathsToProcess[fileIdx];
        const currentVideoBase = currentVideoPath.substring(currentVideoPath.lastIndexOf("/") + 1).replace(/\\/g, "/").split("/").pop()?.split(".")[0] || "video";
        
        setStatusDetail(`[Video ${fileIdx + 1}/${pathsToProcess.length}] Querying details for ${currentVideoBase}...`);
        
        const currentDur = await invoke<number>("get_video_duration", { path: currentVideoPath });
        const currentDims = await invoke<[number, number]>("get_video_dimensions", { path: currentVideoPath });
        const currentHasAudio = await invoke<boolean>("check_audio_track", { path: currentVideoPath });

        // Calculate segmentation ranges
        const segmentStarts: number[] = [startOffset];
        const effectiveDuration = currentDur - startOffset - endOffset;
        if (effectiveDuration <= 0) {
          alert(`Video "${currentVideoBase}" is too short for the specified intro/outro trim options!`);
          continue;
        }
        const numNominalSegments = Math.ceil(effectiveDuration / segmentLength);
        
        for (let i = 1; i < numNominalSegments; i++) {
          const nominalStart = startOffset + i * segmentLength;
          if (useSceneCut) {
            setStatusDetail(`[Video ${fileIdx + 1}/${pathsToProcess.length}] Analyzing transitions around clip ${i} boundary...`);
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
                  "-i", currentVideoPath,
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

        if (aspectRatio === "original" && currentDims[0] > 0) {
          targetW = currentDims[0];
          targetH = currentDims[1];
        } else if (currentDims[0] > 0 && currentDims[1] > 0) {
          if (currentDims[0] > currentDims[1]) {
            targetW = Math.min(currentDims[1], maxW);
          } else {
            targetW = Math.min(currentDims[0], maxW);
          }
          if (targetW % 2 !== 0) targetW--;
          targetH = aspectRatio === "4:5" ? Math.round(targetW * 5 / 4) : Math.round(targetW * 16 / 9);
        }
        if (targetH % 2 !== 0) targetH--;

        // Loop and process each segment natively
        for (let i = 0; i < numSegments; i++) {
          setCurrentClip(i + 1);
          const startTime = segmentStarts[i];
          const endTime = (i < numSegments - 1) ? segmentStarts[i + 1] : (currentDur - endOffset);
          const currentSegmentLength = endTime - startTime;
          
          const currentPrefix = pathsToProcess.length > 1 ? `${currentVideoBase}_clip` : prefix;
          const outputName = `${outputDirectory}/${currentPrefix}_${i + 1}.mp4`;
          setStatusDetail(`[Video ${fileIdx + 1}/${pathsToProcess.length}] Exporting clip ${i + 1}/${numSegments}: ${currentPrefix}_${i + 1}.mp4...`);
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
          args.push("-ss", startTime.toFixed(2), "-t", currentSegmentLength.toFixed(2), "-i", currentVideoPath);
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
          const primaryCropW = currentDims[0] > 0 ? Math.min(currentDims[0], Math.round(currentDims[1] * (targetW / cropTargetH))) : targetW;
          const primaryCropH = currentDims[0] > 0 ? Math.min(currentDims[1], Math.round(currentDims[0] * (cropTargetH / targetW))) : cropTargetH;
          
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
          if (currentHasAudio) {
            let primAF = `[${primaryIdx}:a]`;
            if (bypassCopyright) {
              const pitchFactor = 1.01;
              const tempoCombined = (speed / pitchFactor).toFixed(4);
              primAF += `asetrate=44100*${pitchFactor},atempo=${tempoCombined},aresample=44100`;
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
            if (bgAudioMode === 'bgm_only') {
              filterParts.push(`[primary_a]volume=0[silent_primary_a]`);
              filterParts.push(`[silent_primary_a][bgm_a]amix=inputs=2:duration=first[main_a]`);
            } else {
              filterParts.push(`[primary_a][bgm_a]amix=inputs=2:duration=first[main_a]`);
            }
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
            "-avoid_negative_ts", "1"
          );

          if (bypassCopyright) {
            args.push("-map_metadata", "-1");
          }

          args.push(outputName);

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
      }
      
      alert(`Success! Generated clips for all ${pathsToProcess.length} videos in:\n${outputDirectory}`);
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
    const effectiveDuration = duration - startOffset - endOffset;
    if (effectiveDuration <= 0) return null;
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
        
        {/* Right side header actions */}
        <div className="flex items-center gap-3">
          {/* Quick presets */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-text-2 uppercase font-medium mr-1">Presets:</span>
            
            <div className="relative group">
              <button onClick={() => applyPreset("tiktok")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span>TikTok</span>
              </button>
              {showHelpTooltips && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[200px] hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-neutral-800 z-50 pointer-events-none animate-fade-in font-bold leading-normal text-center">
                  One-click setup: 9:16 tall vertical shape and 1-minute clips for TikTok.
                </div>
              )}
            </div>

            <div className="relative group">
              <button onClick={() => applyPreset("shorts")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span>Shorts</span>
              </button>
              {showHelpTooltips && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[200px] hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-neutral-800 z-50 pointer-events-none animate-fade-in font-bold leading-normal text-center">
                  One-click setup: 9:16 tall vertical shape and 57-second clips for YouTube Shorts.
                </div>
              )}
            </div>

            <div className="relative group">
              <button onClick={() => applyPreset("fb_li")} className="py-1 px-2.5 bg-surface-2 hover:bg-surface-3 border border-border hover:border-accent/40 text-text-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer">
                <Layers className="w-3.5 h-3.5 text-accent" />
                <span>Square</span>
              </button>
              {showHelpTooltips && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-max max-w-[200px] hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-neutral-800 z-50 pointer-events-none animate-fade-in font-bold leading-normal text-center">
                  One-click setup: 4:5 square-ish shape and 2-minute clips for Facebook & LinkedIn.
                </div>
              )}
            </div>
          </div>

          <div className="w-px h-4 bg-border/80"></div>

          {/* Tooltips Help Switch */}
          <label className="relative inline-flex items-center cursor-pointer select-none" title={tooltip("Turn all helper tooltips on or off")}>
            <span className="text-[10px] font-bold text-text-2 mr-2">Help Tips:</span>
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={showHelpTooltips}
              onChange={(e) => handleToggleHelpTooltips(e.target.checked)}
            />
            <div className="relative w-7 h-4 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:border-border after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-accent"></div>
          </label>

          <div className="w-px h-4 bg-border/80"></div>

          {/* Theme Toggle Button */}
          <div className="relative group">
            <button
              onClick={toggleTheme}
              className="p-1 rounded bg-surface-2 hover:bg-surface-3 border border-border text-text-1 transition-all flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-accent fill-accent/10" />
              )}
            </button>
            {showHelpTooltips && (
              <div className="absolute right-0 top-full mt-2 w-max max-w-[200px] hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg border border-neutral-800 z-50 pointer-events-none animate-fade-in font-bold leading-normal text-center">
                {theme === "dark" ? "Click to turn Light Mode ON" : "Click to turn Dark Mode ON"}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main 4-Zone Workspace Layout */}
      <div 
        className="workspace-layout flex-1"
        style={{
          gridTemplateRows: timelineCollapsed ? "1fr 40px" : "1fr 220px"
        }}
      >
        
        {/* ZONE 1: Left Sidebar (Media & Presets) */}
        <div 
          className={`left-sidebar-zone flex flex-col h-full overflow-hidden ${
            isDraggingOver ? "ring-2 ring-accent ring-inset bg-accent/5" : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              const paths = files
                .map((f: any) => f.path || f.name)
                .filter((p) => p && (p.endsWith(".mp4") || p.endsWith(".mkv") || p.endsWith(".avi") || p.endsWith(".mov")));
                
              if (paths.length > 0) {
                setBulkVideoPaths(paths);
                const path = paths[0];
                setVideoPath(path);
                
                try {
                  const url = await invoke<string>("get_video_url", { path });
                  setVideoSrc(url);
                  setStatusDetail("Querying video details...");
                  
                  const dur = await invoke<number>("get_video_duration", { path });
                  setDuration(dur);
                  
                  const dims = await invoke<[number, number]>("get_video_dimensions", { path });
                  setVideoDimensions({ width: dims[0], height: dims[1] });
                  
                  if (!outputDirectory) {
                    const parentDir = path.substring(0, path.lastIndexOf("/"));
                    setOutputDirectory(parentDir);
                  }
                } catch (err) {
                  console.error(err);
                }
              }
            }
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-border bg-surface-2 shrink-0 flex justify-between items-center select-none">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide font-main">Media & Presets</span>
            <span className="text-[9px] bg-accent/20 text-accent font-semibold px-1.5 py-0.5 rounded font-numbers">
              {bulkVideoPaths.length} Files
            </span>
          </div>

          {/* Drag & Drop Area */}
          <div className="p-3 shrink-0">
            {videoPath ? (
              <div className="bg-surface border border-border p-3 rounded-xl text-xs shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    <FileVideo className="w-4.5 h-4.5 text-accent" />
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="text-text-1 font-bold truncate font-main" title={formatSize(videoPath)}>
                      {formatSize(videoPath)}
                    </span>
                    <span className="text-[9px] text-text-2 font-numbers">
                      {Math.floor(duration / 60)}m {Math.floor(duration % 60)}s · {videoDimensions.width}x{videoDimensions.height}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button 
                    onClick={bulkVideoPaths.length > 1 ? selectMainVideos : selectMainVideo} 
                    className="py-1.5 px-2 bg-surface-2 hover:bg-surface-3 border border-border text-[10px] font-bold text-text-1 transition-all cursor-pointer rounded-lg text-center"
                    title={tooltip("Replace active video path")}
                  >
                    Change
                  </button>
                  <button 
                    onClick={() => {
                      setVideoPath("");
                      setVideoSrc("");
                      setDuration(0);
                      setVideoDimensions({ width: 0, height: 0 });
                      setBulkVideoPaths([]);
                    }} 
                    className="py-1.5 px-2 bg-red/5 hover:bg-red/10 text-red text-[10px] font-bold transition-all cursor-pointer rounded-lg text-center"
                    title={tooltip("Clear selection")}
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={selectMainVideos}
                className="w-full py-6 bg-accent/5 hover:bg-accent/10 border border-dashed border-accent/20 hover:border-accent text-accent rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center"
              >
                <UploadCloud className="w-8 h-8 text-accent animate-pulse" />
                <span className="font-main">Drop Video Files Here</span>
                <span className="text-[9px] text-text-2 font-normal">or click to browse from disk</span>
              </div>
            )}
          </div>

          {/* Bulk Video Paths List (Media Bin) */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0 space-y-2 select-none">
            <span className="text-[9px] uppercase font-bold text-text-2 tracking-wider block font-main">Media Bin</span>
            {bulkVideoPaths.length > 0 ? (
              <div className="space-y-1.5">
                {bulkVideoPaths.map((path, idx) => {
                  const isActive = path === videoPath;
                  return (
                    <div 
                      key={idx}
                      onClick={async () => {
                        setVideoPath(path);
                        try {
                          const url = await invoke<string>("get_video_url", { path });
                          setVideoSrc(url);
                          const dur = await invoke<number>("get_video_duration", { path });
                          setDuration(dur);
                          const dims = await invoke<[number, number]>("get_video_dimensions", { path });
                          setVideoDimensions({ width: dims[0], height: dims[1] });
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all hover:scale-[1.01] ${
                        isActive 
                          ? "bg-accent/10 border-accent/50 text-accent font-bold" 
                          : "bg-surface-2/40 border-border/60 hover:bg-surface-2 text-text-1"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <FileVideo className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-accent" : "text-text-2"}`} />
                        <span className="text-[10px] truncate font-main" title={path}>
                          {path.substring(path.lastIndexOf("/") + 1)}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = bulkVideoPaths.filter((_, i) => i !== idx);
                          setBulkVideoPaths(updated);
                          if (isActive) {
                            if (updated.length > 0) {
                              setVideoPath(updated[0]);
                              (async () => {
                                const p = updated[0];
                                const url = await invoke<string>("get_video_url", { path: p });
                                setVideoSrc(url);
                                const dur = await invoke<number>("get_video_duration", { path: p });
                                setDuration(dur);
                                const dims = await invoke<[number, number]>("get_video_dimensions", { path: p });
                                setVideoDimensions({ width: dims[0], height: dims[1] });
                              })();
                            } else {
                              setVideoPath("");
                              setVideoSrc("");
                              setDuration(0);
                              setVideoDimensions({ width: 0, height: 0 });
                            }
                          }
                        }}
                        className="text-text-2 hover:text-red p-0.5 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-[10px] text-text-2 text-center py-6 bg-surface-2/20 border border-border/40 rounded-xl italic">
                No videos selected. Import videos to view them here.
              </div>
            )}
          </div>
        </div>

        {/* ZONE 2: Top Center (Canvas) */}
        <div className="center-canvas-zone flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-border bg-surface-2/60 shrink-0 flex justify-between items-center select-none">
            <span className="text-[10px] uppercase font-bold text-text-2 tracking-wide font-main">Canvas Preview</span>
            
            {/* Safe Zone Type Overlay Toggles */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text-2 font-medium">Safe Zone Overlay:</span>
              <button 
                onClick={() => {
                  if (showSafeZone && safeZoneRatio === "9:16") {
                    setShowSafeZone(false);
                  } else {
                    setShowSafeZone(true);
                    setSafeZoneRatio("9:16");
                  }
                }}
                className={`py-1 px-2 border rounded text-[9px] font-bold transition-all cursor-pointer ${
                  showSafeZone && safeZoneRatio === "9:16" 
                    ? "bg-red/10 border-red/40 text-red" 
                    : "bg-surface border-border text-text-2 hover:text-text-1"
                }`}
              >
                9:16 (Vertical)
              </button>
              <button 
                onClick={() => {
                  if (showSafeZone && safeZoneRatio === "4:5") {
                    setShowSafeZone(false);
                  } else {
                    setShowSafeZone(true);
                    setSafeZoneRatio("4:5");
                  }
                }}
                className={`py-1 px-2 border rounded text-[9px] font-bold transition-all cursor-pointer ${
                  showSafeZone && safeZoneRatio === "4:5" 
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-400" 
                    : "bg-surface border-border text-text-2 hover:text-text-1"
                }`}
              >
                4:5 (Square-ish)
              </button>
            </div>
          </div>

          {/* Preview Workspace */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-6 preview-workspace overflow-hidden min-h-[200px]">
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
                          onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                          muted={isBgAudioEnabled && bgAudioMode === "bgm_only"}
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
                            onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                            muted={isBgAudioEnabled && bgAudioMode === "bgm_only"}
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
                          onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                          muted={isBgAudioEnabled && bgAudioMode === "bgm_only"}
                        />
                      )}
                    </div>
                  )}

                  {/* BGM Preview Audio Player */}
                  {isBgAudioEnabled && bgAudioSrc && (
                    <audio
                      ref={bgAudioPlayerRef}
                      src={bgAudioSrc}
                      loop
                      preload="auto"
                      className="hidden"
                    />
                  )}

                  {/* Watermark Logo drag box */}
                  {watermarkSrc && (
                    <div 
                      onMouseDown={(e) => startDrag(e, "watermark")}
                      onClick={(e) => e.stopPropagation()}
                      style={{ top: `${watermarkY}%`, left: `${watermarkX}%` }}
                      className="absolute z-30 w-10 h-10 -translate-x-1/2 -translate-y-1/2 cursor-move hover:scale-105 active:scale-95 transition-transform"
                      title={tooltip("Drag brand logo watermark")}
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
                      title={tooltip("Drag top headline text overlay")}
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
                      title={tooltip("Drag bottom CTA text overlay")}
                    >
                      {bottomText.replace(/{n}/g, "1")}
                    </div>
                  )}

                  {/* Mobile Safe Zone Mask Grid */}
                  {showSafeZone && (
                    safeZoneRatio === "9:16" ? (
                      <div className="absolute inset-0 border-y-[56px] border-x-[12px] border-red/20 pointer-events-none z-30 flex items-center justify-center">
                        <div className="text-[8px] text-red/80 font-bold uppercase tracking-wider bg-black/90 px-2 py-0.5 rounded border border-red/20 shadow-sm font-main">
                          9:16 Safe Zone
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 border-y-[32px] border-x-[24px] border-purple-500/20 pointer-events-none z-30 flex items-center justify-center">
                        <div className="text-[8px] text-purple-400 font-bold uppercase tracking-wider bg-black/90 px-2 py-0.5 rounded border border-purple-500/20 shadow-sm font-main">
                          4:5 Safe Zone
                        </div>
                      </div>
                    )
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
                    onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget.currentTime)}
                    muted={isBgAudioEnabled && bgAudioMode === "bgm_only"}
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
              <div className="text-center p-8 bg-surface-2 border border-border rounded max-w-sm flex flex-col items-center shadow-md select-none">
                <Film className="w-10 h-10 text-accent/40 mb-3" />
                <h3 className="font-semibold text-sm text-text-1 mb-1.5 font-main">Canvas Preview</h3>
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
              
              <div className="flex items-center gap-1 font-mono text-text-2 select-none font-numbers">
                <span id="preview-current-time" className="font-semibold text-text-1">{formatDisplayTime(previewTime)}</span>
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
            </div>
          </div>
        </div>

        {/* ZONE 3: Right Sidebar (Inspector Panel) */}
        <div className="right-inspector-zone flex flex-col h-full overflow-hidden select-none">
          {/* Tabs header */}
          <div className="grid grid-cols-4 border-b border-border bg-surface-2/80 shrink-0 font-main">
            {[
              { id: "layout", label: "Layout" },
              { id: "viral", label: "Viral" },
              { id: "stealth", label: "Stealth" },
              { id: "export", label: "Export" }
            ].map((tab) => {
              const active = inspectorTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setInspectorTab(tab.id as any)}
                  className={`py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer text-center ${
                    active 
                      ? "border-accent text-accent bg-accent/5 font-black" 
                      : "border-transparent text-text-2 hover:text-text-1 hover:bg-surface-3/30"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 text-xs">
            
            {/* Tab A: Layout Settings */}
            {inspectorTab === "layout" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Aspect Ratio Selector */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Aspect Ratio</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "9:16", label: "9:16", desc: "TikTok/Reels", icon: "📱" },
                      { id: "4:5", label: "4:5", desc: "Feed/Square", icon: "📐" },
                      { id: "original", label: "Original", desc: "Landscape", icon: "🖥️" }
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        type="button"
                        onClick={() => {
                          setAspectRatio(ratio.id as any);
                          setIsReelFormat(ratio.id !== "original");
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-auto min-h-[76px] relative hover:scale-[1.02] active:scale-95 ${
                          aspectRatio === ratio.id
                            ? "bg-accent/10 border-accent text-text-1 font-bold"
                            : "bg-surface border-border text-text-2 hover:border-text-1"
                        }`}
                      >
                        <span className="text-sm">{ratio.icon}</span>
                        <div>
                          <div className="text-[11px] leading-tight font-main">{ratio.label}</div>
                          <div className="text-[9px] font-normal leading-tight mt-0.5">{ratio.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fill Mode framing Mode selector */}
                {isReelFormat && (
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Fill Framing Mode</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFramingMode("blur")}
                        className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                          framingMode === "blur"
                            ? "bg-accent/10 border-accent text-text-1"
                            : "bg-surface border-border text-text-2 hover:border-text-1"
                        }`}
                      >
                        ✨ Ambient Blur
                      </button>
                      <button
                        type="button"
                        onClick={() => setFramingMode("letterbox")}
                        className={`py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                          framingMode === "letterbox"
                            ? "bg-accent/10 border-accent text-text-1"
                            : "bg-surface border-border text-text-2 hover:border-text-1"
                        }`}
                      >
                        🔳 Solid Color
                      </button>
                    </div>
                    
                    {/* Centered Crop Optional selection */}
                    <button
                      type="button"
                      onClick={() => setFramingMode("crop")}
                      className={`w-full py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 text-[11px] ${
                        framingMode === "crop"
                          ? "bg-accent/10 border-accent text-text-1"
                          : "bg-surface border-border text-text-2 hover:border-text-1"
                      }`}
                    >
                      ✂️ Center Crop (Fill Frame)
                    </button>
                  </div>
                )}

                {/* Export Resolution */}
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Export Quality</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {["360p", "480p", "720p", "1080p"].map((res) => (
                      <button
                        key={res}
                        type="button"
                        onClick={() => setExportResolution(res as any)}
                        className={`py-1.5 rounded-lg border font-semibold text-center text-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                          exportResolution === res
                            ? "bg-accent border-accent text-white"
                            : "bg-surface-2 border-border text-text-2 hover:border-text-1"
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gen Z Gameplay Presets Stack */}
                <div className="bg-surface-2/40 border border-border/80 p-3 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Gen Z split screen</span>
                    <input 
                      type="checkbox" 
                      checked={isGenZSplit} 
                      onChange={(e) => {
                        setIsGenZSplit(e.target.checked);
                        if (e.target.checked) {
                          setAspectRatio("9:16");
                          setIsReelFormat(true);
                        }
                      }}
                      className="w-4 h-4 accent-accent cursor-pointer rounded"
                    />
                  </div>
                  {isGenZSplit && (
                    <div className="space-y-2.5 animate-fadeIn">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-text-2 uppercase tracking-wide">Background Video</span>
                        {bgVideoPath ? (
                          <div className="flex justify-between items-center bg-surface p-2 rounded-lg border border-border text-[10px]">
                            <span className="truncate text-text-1 font-semibold max-w-[170px]" title={bgVideoPath}>
                              🎮 {bgVideoPath.substring(bgVideoPath.lastIndexOf("/") + 1)}
                            </span>
                            <button onClick={selectBgVideoFile} className="text-accent hover:underline font-bold cursor-pointer shrink-0">
                              Change
                            </button>
                          </div>
                        ) : (
                          <button onClick={selectBgVideoFile} className="w-full py-2 bg-accent/5 hover:bg-accent/10 border border-dashed border-accent/20 text-accent rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span>Import Secondary Video</span>
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
                        <span className="text-[9px] font-bold text-text-2 uppercase tracking-wide">Gameplay Downloads</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { 
                              name: "Parkour", 
                              icon: "🏃",
                              url: "https://assets.mixkit.co/videos/preview/mixkit-running-in-a-futuristic-neon-tunnel-43034-large.mp4",
                              style: "from-blue-600/10 to-indigo-600/10 border-indigo-500/20"
                            },
                            { 
                              name: "GTA Racing", 
                              icon: "🏎️", 
                              url: "https://assets.mixkit.co/videos/preview/mixkit-fast-car-driving-on-a-highway-at-night-41584-large.mp4",
                              style: "from-red-600/10 to-orange-600/10 border-orange-500/20"
                            },
                            { 
                              name: "Sand Loop", 
                              icon: "⏳", 
                              url: "https://assets.mixkit.co/videos/preview/mixkit-squeezing-yellow-kinetic-sand-47967-large.mp4",
                              style: "from-green-600/10 to-teal-600/10 border-teal-500/20"
                            }
                          ].map((preset) => {
                            const isSelected = bgVideoPath.includes(`clipper_preset_${preset.name.toLowerCase().replace(/\s+/g, "_")}`);
                            return (
                              <button
                                key={preset.name}
                                type="button"
                                onClick={() => downloadPreset(preset.name, preset.url)}
                                className={`p-2 rounded-lg border text-center transition-all bg-gradient-to-tr hover:scale-[1.03] active:scale-97 cursor-pointer flex flex-col items-center justify-center gap-1 ${preset.style} ${
                                  isSelected 
                                    ? "border-accent ring-1 ring-accent" 
                                    : "border-border hover:border-text-2"
                                }`}
                              >
                                <span className="text-sm">{preset.icon}</span>
                                <span className="text-[8px] font-bold text-text-1 font-main">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab B: Viral Tools Settings */}
            {inspectorTab === "viral" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Attention Hooks */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-1 tracking-wider font-main block">Attention Hooks</span>
                      <p className="text-[9px] text-text-2 leading-tight">Add a hook segment before each output clip</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isHookEnabled} 
                      onChange={(e) => setIsHookEnabled(e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer rounded"
                    />
                  </div>
                  {isHookEnabled && (
                    <div className="space-y-2 animate-fadeIn pt-1 border-t border-border/40">
                      <button onClick={addHookFile} className="w-full py-2 bg-surface hover:bg-border border border-border rounded-lg font-bold text-text-1 flex items-center justify-center gap-1.5 text-[10px] cursor-pointer">
                        <Plus className="w-3.5 h-3.5 text-accent" />
                        <span>Add Hook Video</span>
                      </button>
                      {hookPaths.length > 0 && (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          {hookPaths.map((path, idx) => (
                            <div key={idx} className="bg-surface border border-border p-1.5 rounded-lg flex justify-between items-center text-[10px]">
                              <span className="truncate text-text-1 font-semibold max-w-[170px]" title={path}>
                                📄 {path.substring(path.lastIndexOf("/") + 1)}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-text-2 text-[8px] bg-surface px-1 py-0.5 rounded font-bold border border-border font-numbers">
                                  {hookDurations[path] ? `${hookDurations[path].toFixed(1)}s` : "..."}
                                </span>
                                <button onClick={() => removeHookFile(idx)} className="text-red hover:text-red/80 p-0.5 rounded cursor-pointer">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Smart Titles Text */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Smart Titles Overlay</span>
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-text-2 font-bold uppercase">
                        <span>Top Title Header</span>
                        <button 
                          type="button" 
                          onClick={() => setTopText(t => t + "{n}")}
                          className="text-accent hover:underline text-[9px] cursor-pointer font-main"
                        >
                          + Add Index Token &#123;n&#125;
                        </button>
                      </div>
                      <input
                        type="text"
                        value={topText}
                        onChange={(e) => setTopText(e.target.value)}
                        placeholder="e.g. PART {n} - WAIT FOR END..."
                        className="w-full bg-surface border border-border rounded-lg p-2 text-text-1 focus:border-accent outline-none text-xs font-bold"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-text-2 font-bold uppercase">
                        <span>Bottom Footer CTA</span>
                        <button 
                          type="button" 
                          onClick={() => setBottomText(b => b + "{n}")}
                          className="text-accent hover:underline text-[9px] cursor-pointer font-main"
                        >
                          + Add Index Token &#123;n&#125;
                        </button>
                      </div>
                      <input
                        type="text"
                        value={bottomText}
                        onChange={(e) => setBottomText(e.target.value)}
                        placeholder="e.g. LIKE FOR PART {n}!"
                        className="w-full bg-surface border border-border rounded-lg p-2 text-text-1 focus:border-accent outline-none text-xs font-bold"
                      />
                    </div>

                    {/* Height positioning sliders */}
                    {(topText || bottomText) && (
                      <div className="space-y-2 pt-2 border-t border-border/40 animate-fadeIn">
                        <div>
                          <div className="flex justify-between text-[9px] text-text-2 font-bold uppercase mb-0.5">
                            <span>Top Text Height</span>
                            <span className="font-mono text-accent font-numbers">{topTextY}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="2" 
                            max="50" 
                            value={topTextY} 
                            onChange={(e) => setTopTextY(parseInt(e.target.value))} 
                            className="w-full accent-accent cursor-pointer h-1 bg-surface-3 rounded-lg appearance-none"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[9px] text-text-2 font-bold uppercase mb-0.5">
                            <span>Bottom Text Height</span>
                            <span className="font-mono text-accent font-numbers">{bottomTextY}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="50" 
                            max="98" 
                            value={bottomTextY} 
                            onChange={(e) => setBottomTextY(parseInt(e.target.value))} 
                            className="w-full accent-accent cursor-pointer h-1 bg-surface-3 rounded-lg appearance-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* BGM Volume Track Picker */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-text-1 tracking-wider font-main block">Background Music Track</span>
                      <p className="text-[9px] text-text-2 leading-tight">Loop BGM audio quietly under video</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={isBgAudioEnabled} 
                      onChange={(e) => setIsBgAudioEnabled(e.target.checked)}
                      className="w-4 h-4 accent-accent cursor-pointer rounded"
                    />
                  </div>
                  {isBgAudioEnabled && (
                    <div className="space-y-2.5 animate-fadeIn pt-1 border-t border-border/40">
                      <div className="space-y-1">
                        <span className="text-[9px] text-text-2 font-bold uppercase block mb-1">Audio Export Option</span>
                        <select
                          value={bgAudioMode}
                          onChange={(e) => setBgAudioMode(e.target.value as "mix" | "bgm_only")}
                          className="w-full px-2 py-1 bg-surface border border-border rounded text-[10px] text-text-1 outline-none font-bold cursor-pointer"
                        >
                          <option value="mix">Mix Original Audio + BGM</option>
                          <option value="bgm_only">BGM Only (Mute Original Video)</option>
                        </select>
                      </div>

                      {bgAudioPath ? (
                        <div className="space-y-2 pt-1.5 border-t border-border/20">
                          <div className="flex justify-between items-center bg-surface p-2 rounded-lg border border-border text-[10px]">
                            <span className="truncate text-text-1 font-semibold max-w-[170px]" title={bgAudioPath}>
                              🎵 {bgAudioPath.substring(bgAudioPath.lastIndexOf("/") + 1)}
                            </span>
                            <button onClick={selectBgAudioFile} className="text-accent hover:underline font-bold cursor-pointer shrink-0">
                              Change
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] text-text-2 font-bold uppercase">
                              <span>BGM Volume Mix</span>
                              <span className="text-accent font-numbers">{Math.round(bgmVolume * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-3.5 h-3.5 text-text-2" />
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={bgmVolume}
                                onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                                className="flex-1 accent-accent cursor-pointer h-1 bg-surface-3 rounded-lg appearance-none"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button onClick={selectBgAudioFile} className="w-full py-2 bg-surface border border-border hover:border-accent rounded-lg text-[10px] font-bold text-text-1 flex items-center justify-center gap-1.5 cursor-pointer">
                          <Plus className="w-3.5 h-3.5 text-accent" />
                          <span>Import BGM Audio File</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab C: Stealth & Bypass Settings */}
            {inspectorTab === "stealth" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Master Bypass Card */}
                <div className="bg-surface-2/40 border border-border/85 p-4 rounded-2xl flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-text-1 tracking-wider font-main block font-semibold">Master Bypass Pack</span>
                      <p className="text-[9.5px] text-text-2 leading-tight">Evade automated content filters & shadowbans</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={bypassCopyright}
                        onChange={(e) => setBypassCopyright(e.target.checked)}
                      />
                      <div className="relative w-8 h-4.5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-1 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-accent"></div>
                    </label>
                  </div>

                  {/* Sub-settings container */}
                  <div className="border-t border-border/40 pt-3">
                    <button 
                      onClick={() => setIsStealthExpanded(!isStealthExpanded)}
                      className="w-full flex justify-between items-center text-[10px] font-bold text-text-2 hover:text-text-1 transition-all uppercase tracking-wide pb-1 cursor-pointer font-main"
                    >
                      <span>Stealth Sub-Settings</span>
                      {isStealthExpanded ? <ChevronUp className="w-3.5 h-3.5 text-accent" /> : <ChevronDown className="w-3.5 h-3.5 text-accent" />}
                    </button>
                    
                    {isStealthExpanded && (
                      <div className="space-y-3.5 mt-2 animate-fadeIn">
                        {/* Metadata Scrubbing */}
                        <div className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                          <div>
                            <span className="font-bold text-text-1 text-[10.5px] font-main block">Smart Metadata Stripper</span>
                            <span className="text-[8.5px] text-text-2">Erases timestamps, camera info (-map_metadata)</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={metadataScrubbing}
                            onChange={(e) => setMetadataScrubbing(e.target.checked)}
                            className="w-4 h-4 rounded accent-accent cursor-pointer"
                          />
                        </div>

                        {/* Audio Shift */}
                        <div className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                          <div>
                            <span className="font-bold text-text-1 text-[10.5px] font-main block">Audio Wave Pitch Shifter</span>
                            <span className="text-[8.5px] text-text-2">Subtly alters frequency to bypass audio fingerprint ID</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={audioShift}
                            onChange={(e) => setAudioShift(e.target.checked)}
                            className="w-4 h-4 rounded accent-accent cursor-pointer"
                          />
                        </div>

                        {/* Anti Copyright Speed Range Slider */}
                        <div className="p-2.5 bg-surface rounded-xl border border-border space-y-1.5">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-text-1 text-[10.5px] font-main block">Anti-Copyright Speedup</span>
                              <span className="text-[8.5px] text-text-2">Subtle playback speedup (1.01x to 1.03x)</span>
                            </div>
                            <span className="font-mono text-accent font-black text-xs font-numbers">
                              {((antiCopyrightSpeed - 1) * 100).toFixed(0)}% Speedup
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1.01"
                            max="1.03"
                            step="0.01"
                            value={antiCopyrightSpeed}
                            onChange={(e) => setAntiCopyrightSpeed(parseFloat(e.target.value))}
                            className="w-full accent-accent cursor-pointer h-1 bg-surface-3 rounded-lg appearance-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Brand Logo Watermark Section */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <span className="text-[10px] uppercase font-bold text-text-2 tracking-wider font-main block">Brand Logo Watermark</span>
                  {watermarkPath ? (
                    <div className="flex flex-col gap-2 bg-surface p-2.5 rounded-lg border border-border text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="truncate text-text-1 font-semibold max-w-[170px]" title={watermarkPath}>
                          🖼️ {watermarkPath.substring(watermarkPath.lastIndexOf("/") + 1)}
                        </span>
                        <button onClick={() => { setWatermarkPath(""); setWatermarkSrc(""); }} className="text-red hover:text-red/80 font-bold cursor-pointer">
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2 pt-1.5 border-t border-border/40 justify-between">
                        <span className="text-[9px] text-text-2 font-bold uppercase font-main">Position Preset</span>
                        <select
                          value={watermarkPosition}
                          onChange={(e) => {
                            const pos = e.target.value as "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
                            setWatermarkPosition(pos);
                            if (pos === "topLeft") {
                              setWatermarkX(15);
                              setWatermarkY(10);
                            } else if (pos === "topRight") {
                              setWatermarkX(85);
                              setWatermarkY(10);
                            } else if (pos === "bottomLeft") {
                              setWatermarkX(15);
                              setWatermarkY(85);
                            } else if (pos === "bottomRight") {
                              setWatermarkX(85);
                              setWatermarkY(85);
                            }
                          }}
                          className="px-1.5 py-0.5 bg-surface-2 border border-border rounded text-[10px] text-text-1 outline-none font-bold font-main"
                        >
                          <option value="topRight">Top R</option>
                          <option value="topLeft">Top L</option>
                          <option value="bottomRight">Bottom R</option>
                          <option value="bottomLeft">Bottom L</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <button onClick={selectWatermarkImage} className="w-full py-2 bg-surface border border-border hover:border-accent rounded-lg text-[10px] font-bold text-text-1 flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      <ImageIcon className="w-3.5 h-3.5 text-accent" />
                      <span>Select Branding Watermark Image</span>
                    </button>
                  )}
                </div>

                {/* Smart Scene Cut Detection Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-surface-2/40 border border-border/85 rounded-2xl">
                  <div>
                    <span className="font-bold text-text-1 text-[11px] font-main block">Smart Scene Cut Detection</span>
                    <span className="text-[9px] text-text-2">Splits video at scene shifts rather than mid-sentence</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={useSceneCut}
                    onChange={(e) => setUseSceneCut(e.target.checked)}
                    className="w-4 h-4 rounded accent-accent cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Tab D: Export & Bulk Actions Settings */}
            {inspectorTab === "export" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Target Output directory picker */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-bold text-text-2">
                    <span>Output Folder Location</span>
                    {outputDirectory && <span className="text-green font-semibold">Configured</span>}
                  </div>
                  <button 
                    onClick={selectOutputDir}
                    className="w-full py-2 bg-surface hover:bg-surface-3 border border-border rounded-xl font-bold text-text-1 flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer shadow-sm font-main"
                  >
                    <FolderOpen className="w-4 h-4 text-accent" />
                    <span>{outputDirectory ? "Change Destination Folder" : "Select Export Folder"}</span>
                  </button>
                  {outputDirectory && (
                    <p className="bg-surface border border-border p-2 rounded-lg font-mono text-[9px] text-text-2 truncate select-all font-numbers">{outputDirectory}</p>
                  )}
                </div>

                {/* Split Settings */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-text-2 mb-1 select-none font-main">Split Limit (min)</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={segmentLengthMinutes}
                      onChange={(e) => setSegmentLengthMinutes(parseFloat(e.target.value) || 1)}
                      className="w-full bg-surface border border-border rounded-lg p-1.5 text-text-1 focus:border-accent outline-none font-mono font-bold text-center text-xs font-numbers"
                    />
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase font-bold text-text-2 mb-1 select-none font-main">File Prefix Name</span>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg p-1.5 text-text-1 focus:border-accent outline-none font-mono font-bold text-center text-xs font-main"
                    />
                  </div>
                </div>

                {/* Trimmer offsets */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-text-1 text-[10px] font-main block">Intro Cut (Start Offset)</span>
                      <span className="text-[9px] text-text-2">Skip beginning intro seconds</span>
                    </div>
                    <div className="relative w-20 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={startOffset}
                        onChange={(e) => setStartOffset(parseFloat(e.target.value) || 0)}
                        className="w-full pr-5 pl-1.5 py-1 bg-surface border border-border rounded-lg focus:border-accent outline-none text-text-1 text-xs font-bold text-right font-numbers"
                      />
                      <span className="absolute right-1.5 inset-y-0 flex items-center text-xs text-text-2 font-mono pointer-events-none font-bold">s</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-2.5">
                    <div>
                      <span className="font-bold text-text-1 text-[10px] font-main block">Outro Cut (End Offset)</span>
                      <span className="text-[9px] text-text-2">Cut ending outro seconds</span>
                    </div>
                    <div className="relative w-20 shrink-0">
                      <input
                        type="number"
                        min="0"
                        value={endOffset}
                        onChange={(e) => setEndOffset(parseFloat(e.target.value) || 0)}
                        className="w-full pr-5 pl-1.5 py-1 bg-surface border border-border rounded-lg focus:border-accent outline-none text-text-1 text-xs font-bold text-right font-numbers"
                      />
                      <span className="absolute right-1.5 inset-y-0 flex items-center text-xs text-text-2 font-mono pointer-events-none font-bold">s</span>
                    </div>
                  </div>
                </div>

                {/* Bulk Videos selected list summary */}
                <div className="bg-surface-2/40 border border-border/85 p-3 rounded-2xl space-y-2">
                  <span className="text-[9px] uppercase font-bold text-text-2 tracking-wider block font-main">Batch Export Queue</span>
                  {bulkVideoPaths.length > 0 ? (
                    <div className="max-h-24 overflow-y-auto pr-1 space-y-1">
                      {bulkVideoPaths.map((p, index) => (
                        <div key={index} className="text-[10px] bg-surface p-1.5 rounded border border-border text-text-2 truncate font-main" title={p}>
                          {index + 1}. {p.substring(p.lastIndexOf("/") + 1)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[9.5px] text-text-2 italic bg-surface/40 p-2 border border-border/40 rounded-xl text-center">
                      No bulk items. Will export the single active video path.
                    </div>
                  )}
                </div>

                {/* Processing Progress Status Block */}
                {processing ? (
                  <div className="bg-surface-2/60 border border-border/80 rounded-2xl p-3.5 space-y-2.5 font-main">
                    <div className="flex justify-between items-center text-xs select-none">
                      <span className="text-text-1 font-bold flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
                        <span>Part {currentClip} / {totalClips}</span>
                      </span>
                      <span className="font-mono text-accent font-black font-numbers">{progress}%</span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden border border-border">
                      <div style={{ width: `${progress}%` }} className="h-full bg-accent transition-all duration-300"></div>
                    </div>
                    
                    <p className="text-[9.5px] text-text-2 truncate font-semibold">{statusDetail}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSplit}
                      disabled={!videoPath || !outputDirectory}
                      className="flex-1 py-3 bg-accent hover:bg-accent-hover disabled:bg-accent/20 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 text-xs cursor-pointer hover:scale-[1.02] active:scale-98 font-main"
                    >
                      <Scissors className="w-4 h-4" />
                      <span>Clip It (Run Loop)</span>
                    </button>
                    {outputDirectory && (
                      <button 
                        onClick={openOutputFolder}
                        className="px-3 bg-surface hover:bg-surface-3 border border-border rounded-xl text-text-1 font-bold shadow hover:scale-102 active:scale-98 transition-all flex items-center justify-center cursor-pointer"
                        title={tooltip("Open output folder in native manager")}
                      >
                        <FolderOpen className="w-4 h-4 text-accent" />
                      </button>
                    )}
                  </div>
                )}

                {/* FFmpeg Console logs collapsible block */}
                <div className="border border-border rounded-xl bg-surface-2/40 overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setShowConsole(!showConsole)}
                    className="w-full py-2 px-3 flex justify-between items-center text-[9px] font-bold text-text-2 hover:bg-surface-3/30 transition-all uppercase tracking-wider cursor-pointer select-none font-main"
                  >
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-accent" />
                      <span>Console Logs</span>
                    </span>
                    {showConsole ? <ChevronUp className="w-3.5 h-3.5 text-accent" /> : <ChevronDown className="w-3.5 h-3.5 text-accent" />}
                  </button>
                  {showConsole && (
                    <div className="h-28 bg-black/95 text-green-500 font-mono text-[9px] p-2 overflow-y-auto space-y-0.5 border-t border-border select-text font-numbers">
                      {ffmpegLogs.length > 0 ? (
                        ffmpegLogs.map((log, idx) => (
                          <div key={idx} className="truncate">{log}</div>
                        ))
                      ) : (
                        <div className="text-neutral-500 italic font-main">Logs will stream here during ffmpeg execution.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ZONE 4: Bottom (Timeline) */}
        <div className="bottom-timeline-zone flex flex-col overflow-hidden">
          {/* Timeline Header */}
          <div className="h-10 border-b border-border bg-surface-2/80 flex items-center justify-between px-4 text-xs select-none shrink-0 font-main">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setTimelineCollapsed(!timelineCollapsed)}
                className="font-display font-bold uppercase tracking-wider text-text-2 hover:text-text-1 flex items-center gap-1 cursor-pointer"
              >
                {timelineCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-accent" /> : <ChevronDown className="w-3.5 h-3.5 text-accent" />}
                <span>Timeline Tracks</span>
              </button>
              {duration > 0 && !timelineCollapsed && (
                <span id="timeline-current-time" className="font-mono bg-surface border border-border text-accent px-2 py-0.5 rounded font-numbers">
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
                <span className="font-mono text-text-2 font-medium w-8 text-right font-numbers">{Math.round(timelineZoom * 100)}%</span>
              </div>
            )}
          </div>

          {!timelineCollapsed && (
            <div className="flex-1 flex overflow-hidden">
              {/* Left track names headers */}
              <div className="w-[100px] border-r border-border bg-surface-2/50 flex flex-col select-none shrink-0 font-medium text-[10px] uppercase tracking-wider text-text-2 text-left z-20 font-main">
                <div className="h-7 border-b border-border flex items-center px-2.5 bg-surface-3/30">Ruler</div>
                <div className="h-9 border-b border-border flex items-center px-2.5 gap-1"><Film className="w-3 h-3 text-accent" /> Video</div>
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
                  <div className="h-7 border-b border-border relative bg-surface-3/10 pointer-events-none select-none font-numbers">
                    {renderRulerTicks()}
                  </div>

                  <div className="h-9 border-b border-border relative bg-surface-2/5 flex items-center">
                    {duration > 0 && (
                      <div className="absolute inset-y-1.5 left-0 right-0 flex px-1">
                        {/* Video track bar */}
                        <div className="relative w-full h-6 rounded bg-accent/10 border border-accent/20 flex items-center justify-between px-2 text-[10px] font-medium text-accent overflow-hidden font-main">
                          <span className="truncate">{videoPath.substring(videoPath.lastIndexOf("/") + 1)}</span>
                          {isHookEnabled && hookPaths.length > 0 && (
                            <span className="bg-amber-500 text-neutral-950 px-1 py-0.5 rounded text-[8px] font-bold uppercase shrink-0">
                              Hook
                            </span>
                          )}

                          {/* Intro Cut Overlay */}
                          {startOffset > 0 && (
                            <div 
                              className="absolute top-0 bottom-0 left-0 bg-red/25 border-r border-red/40 z-20 flex items-center justify-center text-[7px] text-red-300 font-bold uppercase tracking-tighter"
                              style={{ width: `${(startOffset / duration) * 100}%` }}
                            >
                              Intro Cut
                            </div>
                          )}

                          {/* Outro Cut Overlay */}
                          {endOffset > 0 && (
                            <div 
                              className="absolute top-0 bottom-0 right-0 bg-red/25 border-l border-red/40 z-20 flex items-center justify-center text-[7px] text-red-300 font-bold uppercase tracking-tighter"
                              style={{ width: `${(endOffset / duration) * 100}%` }}
                            >
                              Outro Cut
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {renderCutBoundaryMarkers()}
                  </div>

                  <div className="h-9 border-b border-border relative bg-surface-2/5 flex items-center">
                    {isBgAudioEnabled && bgAudioPath && duration > 0 && (
                      <div className="w-full h-6 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-medium flex items-center px-2 gap-1 overflow-hidden font-main">
                        <Music className="w-3.5 h-3.5 text-amber-400" />
                        <span className="truncate">BGM: {bgAudioPath.substring(bgAudioPath.lastIndexOf("/") + 1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="h-9 relative bg-surface-2/5 flex items-center">
                    {isGenZSplit && bgVideoPath && duration > 0 && (
                      <div className="w-full h-6 rounded bg-green/10 border border-green/25 text-green-400 text-[10px] font-medium flex items-center px-2 gap-1 overflow-hidden font-main">
                        <Smartphone className="w-3.5 h-3.5 text-green-400" />
                        <span className="truncate">Gameplay: {bgVideoPath.substring(bgVideoPath.lastIndexOf("/") + 1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Playhead */}
                  {duration > 0 && (
                    <div 
                      id="timeline-playhead"
                      className="absolute top-0 bottom-0 w-[1.5px] bg-red z-30 pointer-events-none flex flex-col items-center"
                      style={{ left: `${(previewTime / duration) * 100}%` }}
                    >
                      <div className="w-2.5 h-2.5 bg-red rotate-45 -translate-y-1.5 border-t border-l border-red/40"></div>
                      <div className="w-[1px] h-full bg-red/80"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}