import { pipeline, env } from "./transformers.min.js";

// Configure local execution environments
env.allowLocalModels = false;

// Point WebAssembly runtime to local directory (where we copied the .wasm files)
env.backends.onnx.wasm.wasmPaths = "/";

let transcriberPromise = null;

async function getTranscriber(progressCallback) {
  if (transcriberPromise) return transcriberPromise;

  try {
    console.log("Attempting to load Whisper model with WebGPU...");
    // Use onnx-community model, which has optimized configurations for WebGPU/v3
    const model = await pipeline("automatic-speech-recognition", "onnx-community/whisper-tiny.en", {
      device: "webgpu",
      progress_callback: progressCallback,
    });
    console.log("Whisper loaded successfully with WebGPU.");
    transcriberPromise = Promise.resolve(model);
    return model;
  } catch (webgpuError) {
    console.warn("WebGPU initialization failed. Falling back to CPU/WASM:", webgpuError);
    try {
      const model = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
        device: "wasm",
        progress_callback: progressCallback,
      });
      console.log("Whisper loaded successfully with WASM.");
      transcriberPromise = Promise.resolve(model);
      return model;
    } catch (wasmError) {
      console.error("WASM fallback failed as well:", wasmError);
      throw wasmError;
    }
  }
}

self.addEventListener("message", async (event) => {
  const { audio } = event.data;
  if (!audio) return;

  try {
    self.postMessage({ status: "loading", message: "Initializing Whisper model..." });

    const transcriber = await getTranscriber((data) => {
      if (data.status === "progress") {
        self.postMessage({
          status: "progress",
          progress: data.progress,
          file: data.file,
        });
      }
    });

    self.postMessage({ status: "transcribing", message: "Transcribing audio..." });

    // Run Whisper speech recognition with timestamp returns enabled
    const result = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });

    self.postMessage({ status: "completed", result });
  } catch (error) {
    console.error("Transcription error in worker:", error);
    self.postMessage({ status: "error", error: error.message || String(error) });
  }
});
