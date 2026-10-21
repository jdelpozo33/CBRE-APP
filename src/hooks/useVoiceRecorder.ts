import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudioLocally } from "../services/transcriptionService.ts";

// Microphone capture with live browser dictation, falling back to in-browser Whisper
// transcription of the recording when live speech recognition is unavailable.
export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef("");
  const resolveStopRef = useRef<((text: string) => void) | null>(null);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
  };

  useEffect(() => () => {
    cleanup();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus(null);
    setTranscript("");
    transcriptRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const mimeType = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        let text = transcriptRef.current.trim();
        if (!text && chunksRef.current.length > 0) {
          setIsTranscribing(true);
          try {
            text = await transcribeAudioLocally(new Blob(chunksRef.current, { type: recorder.mimeType }), setStatus);
            setTranscript(text);
            transcriptRef.current = text;
          } catch (err: any) {
            setError(`Transcription failed: ${err?.message || err}`);
          } finally {
            setIsTranscribing(false);
            setStatus(null);
          }
        }
        resolveStopRef.current?.(text);
        resolveStopRef.current = null;
      };

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || "en-US";
        recognition.onresult = (event: any) => {
          let text = "";
          for (let i = 0; i < event.results.length; i++) text += event.results[i][0].transcript + " ";
          transcriptRef.current = text;
          setTranscript(text);
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.start(500);
      recorderRef.current = recorder;
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setIsRecording(true);
    } catch (err: any) {
      setError(
        err?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow microphone access for this site in your browser settings."
          : `Could not start recording: ${err?.message || err}`
      );
    }
  }, []);

  // Stops recording and resolves with the final transcript.
  const stop = useCallback(
    () =>
      new Promise<string>((resolve) => {
        const recorder = recorderRef.current;
        cleanup();
        setIsRecording(false);
        if (!recorder || recorder.state === "inactive") {
          resolve(transcriptRef.current.trim());
          return;
        }
        resolveStopRef.current = resolve;
        recorder.stop();
      }),
    []
  );

  return { isRecording, isTranscribing, transcript, setTranscript, status, error, seconds, start, stop };
}
