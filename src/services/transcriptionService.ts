import type { AutomaticSpeechRecognitionPipeline, ProgressInfo } from "@huggingface/transformers";

// Claude does not accept audio input, so speech-to-text runs locally in the browser with
// Whisper (Transformers.js). Claude then cleans up the raw transcript server-side.
const WHISPER_MODEL = "onnx-community/whisper-base.en";
const SAMPLE_RATE = 16000;

let asrPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

function loadWhisper(onStatus?: (message: string) => void) {
  if (!asrPromise) {
    asrPromise = import("@huggingface/transformers")
      .then(({ pipeline }) =>
        pipeline("automatic-speech-recognition", WHISPER_MODEL, {
          progress_callback: (info: ProgressInfo) => {
            if (info.status === "progress" && info.file.endsWith(".onnx")) {
              onStatus?.(`Downloading speech model (first use only)... ${Math.round(info.progress)}%`);
            }
          },
        })
      )
      .catch((err) => {
        asrPromise = null;
        throw err;
      });
  }
  return asrPromise;
}

// Decode any browser-supported audio file (webm, mp3, wav, m4a, ogg) into 16 kHz mono PCM.
async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (decoded.numberOfChannels === 1) return decoded.getChannelData(0);
    const mono = new Float32Array(decoded.length);
    for (let ch = 0; ch < decoded.numberOfChannels; ch++) {
      const data = decoded.getChannelData(ch);
      for (let i = 0; i < data.length; i++) mono[i] += data[i] / decoded.numberOfChannels;
    }
    return mono;
  } finally {
    ctx.close();
  }
}

export async function transcribeAudioLocally(
  blob: Blob,
  onStatus?: (message: string) => void
): Promise<string> {
  onStatus?.("Loading speech model...");
  const asr = await loadWhisper(onStatus);
  onStatus?.("Decoding audio...");
  const audio = await decodeToMono16k(blob);
  onStatus?.("Transcribing audio...");
  const output = await asr(audio, { chunk_length_s: 30, stride_length_s: 5 });
  const result = Array.isArray(output) ? output[0] : output;
  return (result?.text || "").trim();
}
