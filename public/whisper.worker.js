import { pipeline, env } from "./transformers.min.js";

// Configure local execution environments
env.allowLocalModels = false;

// Point WebAssembly runtime to local directory (where we copied the .wasm files)
env.backends.onnx.wasm.wasmPaths = "/";

let transcriberPromise = null;

async function getTranscriber(progressCallback) {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
      progress_callback: progressCallback,
    });
  }
  return transcriberPromise;
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
