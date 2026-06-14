import { pipeline, env } from "./transformers.min.js";

// Configure local execution environments
env.allowLocalModels = false;

// Force single-threaded execution to prevent multi-threading overhead/instability in WebKit
env.backends.onnx.wasm.numThreads = 1;

// Point WebAssembly runtime to local directory (where we copied the .wasm files)
env.backends.onnx.wasm.wasmPaths = "/";

let transcriberPromise = null;

async function getTranscriber(progressCallback) {
  if (transcriberPromise) return transcriberPromise;

  // Directly load Xenova's model on WASM. Disable level 2/3 graph optimizations 
  // (by setting graphOptimizationLevel to 'basic') to prevent the ONNX Runtime 1.26-dev
  // compiler from trying to rewrite the QDQ nodes into MatMulNBits, which crashes.
  console.log("Loading Whisper model with CPU/WASM...");
  try {
    const model = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
      device: "wasm",
      progress_callback: progressCallback,
      session_options: {
        graphOptimizationLevel: "basic",
      }
    });
    console.log("Whisper loaded successfully with WASM.");
    transcriberPromise = Promise.resolve(model);
    return model;
  } catch (wasmError) {
    console.error("WASM load failed:", wasmError);
    throw wasmError;
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
