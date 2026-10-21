import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  RefreshCw,
  FileAudio,
  Sparkles,
  ArrowRight,
  Zap,
  Volume2,
  Edit2,
  CheckCircle2,
  Bot,
  Flame,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { sampleBrokerDebriefs } from "../data/sampleCalls.ts";
import { transcribeAudioLocally } from "../services/transcriptionService.ts";

interface AudioRecorderProps {
  onProcessTranscript: (
    transcript: string,
    meetingTitle: string,
    dealContext?: string,
    autoDispatchEmails?: boolean
  ) => Promise<void>;
  isProcessing: boolean;
  onAutoLoggedActivity?: (title: string, entity: string, outcome: string) => Promise<void>;
  speedMode?: "turbo" | "balanced";
  onToggleSpeedMode?: (mode: "turbo" | "balanced") => void;
  lastAiLatency?: { ms: number; model: string; cached: boolean } | null;
  prefilledContext?: { propertyAddress?: string; clientName?: string; meetingTitle?: string } | null;
  onClearPrefilledContext?: () => void;
  onOpenExternalIntel?: (query?: string) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onProcessTranscript,
  isProcessing,
  onAutoLoggedActivity,
  speedMode = "turbo",
  onToggleSpeedMode,
  lastAiLatency,
  prefilledContext,
  onClearPrefilledContext,
  onOpenExternalIntel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showUpload, setShowUpload] = useState<boolean>(false);
  const [showCheatSheet, setShowCheatSheet] = useState<boolean>(false);
  const [showSpeedArchitecture, setShowSpeedArchitecture] = useState<boolean>(false);

  // Automation states
  const [handsFreeAutoPilot, setHandsFreeAutoPilot] = useState<boolean>(true);
  const [autoStatusMessage, setAutoStatusMessage] = useState<string | null>(null);
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);

  const audioBlobRef = useRef<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // VAD (Voice Activity / Silence Detection) refs
  const hasSpokenRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef<string>("");

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (prefilledContext?.propertyAddress && !transcript) {
      setTranscript(
        `Debrief for ${prefilledContext.propertyAddress} with ${prefilledContext.clientName || "Counterparty"}.\nMeeting: ${prefilledContext.meetingTitle || "Walkthrough & Terms"}\n\nAgreed terms:\n- Agreed Purchase Price: \n- Implied Cap Rate: \n- Earnest Money Deposit: \n- Due Diligence Period: \n- Closing Date: \n- Next steps for Sarah Chen (Escrow) and David Steinberg (Lender): `
      );
    }
  }, [prefilledContext]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
  };

  // Start microphone voice memo recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      hasSpokenRef.current = false;
      setAutoStatusMessage(null);

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const updateMeter = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const currentLevel = Math.min(100, Math.round((average / 128) * 100));
        setAudioLevel(currentLevel);

        // Automated Silence Detection (VAD)
        if (handsFreeAutoPilot) {
          if (currentLevel > 14 || transcriptRef.current.length > 25) {
            hasSpokenRef.current = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else if (hasSpokenRef.current && currentLevel < 10) {
            if (!silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                // Automated stop & execute without pressing any button!
                setAutoStatusMessage("Silence detected — Auto-executing pipeline...");
                stopRecording(true);
              }, 2200);
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const supportedMime = mimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: supportedMime });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: supportedMime });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        audioBlobRef.current = audioBlob;
        setFileName(`Debrief_${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`);

        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setAudioLevel(0);

        // Browsers without live speech recognition (e.g. Firefox) produce no transcript while
        // recording, so transcribe the saved recording instead.
        if (!transcriptRef.current.trim()) {
          handleTranscribeAudio(audioBlob);
        }
      };

      // Real-time live browser speech transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          setTranscript(currentTranscript);
          transcriptRef.current = currentTranscript;
          hasSpokenRef.current = true;
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setAutoStatusMessage("Microphone access was denied. You can click '⚡ Auto-Pilot Demo' or paste your debrief.");
    }
  };

  const stopRecording = (shouldAutoAnalyze = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      if (shouldAutoAnalyze && handsFreeAutoPilot) {
        setTimeout(() => {
          const currentText = transcriptRef.current || sampleBrokerDebriefs[0].transcript;
          onProcessTranscript(currentText, "Spoken Meeting Debrief", undefined, true);
        }, 500);
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    audioBlobRef.current = file;
    handleTranscribeAudio(file);
  };

  // Speech-to-text runs in the browser (Whisper); Claude then cleans up the raw transcript.
  const handleTranscribeAudio = async (audio: Blob | null = audioBlobRef.current) => {
    if (!audio) return;
    setIsTranscribing(true);
    try {
      const rawTranscript = await transcribeAudioLocally(audio, setAutoStatusMessage);
      if (!rawTranscript) {
        setAutoStatusMessage("No speech was detected in this recording.");
        return;
      }
      setTranscript(rawTranscript);

      setAutoStatusMessage("Claude is cleaning up the transcript...");
      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTranscript }),
      });
      const data = await res.json();
      if (data.transcript) {
        setTranscript(data.transcript);
      }
      setAutoStatusMessage(null);
    } catch (err: any) {
      console.error("Transcription error:", err);
      setAutoStatusMessage(`Audio transcription failed: ${err?.message || "unknown error"}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleLoadSampleDebrief = (sampleIndex = 0) => {
    const sample = sampleBrokerDebriefs[sampleIndex] || sampleBrokerDebriefs[0];
    setTranscript(sample.transcript);
  };

  // FULLY AUTOMATED HANDS-FREE EXECUTION:
  // The human does not have to push any instructions or type any buttons!
  const handleAutoPilotHandsFreeDemo = async () => {
    setIsAutoSimulating(true);
    setAutoStatusMessage("⚡ Auto-Pilot: Spoken memo finished. Transcribing debrief...");

    const sample = sampleBrokerDebriefs[0];
    setTranscript(sample.transcript);

    // Automatically trigger end-to-end processing & email dispatch
    setTimeout(async () => {
      setAutoStatusMessage("⚡ Auto-Pilot: Matching CBRE CRM & querying live Claude web search comps...");
      await onProcessTranscript(sample.transcript, "1420 Market Street Debrief", undefined, true);
      setIsAutoSimulating(false);
      setAutoStatusMessage(null);
    }, 1200);
  };

  const handleRunIntelligence = () => {
    if (!transcript.trim()) {
      alert("Please record or speak your meeting debrief first.");
      return;
    }
    onProcessTranscript(transcript, "Broker Meeting Debrief", undefined, handsFreeAutoPilot);
  };

  return (
    <div className="space-y-6">
      {/* Automated Hands-Free Status Banner */}
      {autoStatusMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
            <span>{autoStatusMessage}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800 font-bold">
            Auto-Pilot Active
          </span>
        </div>
      )}

      {/* Linked Pre-Meeting Context Banner */}
      {prefilledContext && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 mr-2">Linked Pre-Meeting Dossier:</span>
              <span className="text-emerald-800 font-semibold">{prefilledContext.propertyAddress}</span>
              {prefilledContext.clientName && (
                <span className="text-slate-500 ml-1.5">({prefilledContext.clientName})</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onOpenExternalIntel && (
              <button
                type="button"
                onClick={() => onOpenExternalIntel(prefilledContext.propertyAddress)}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-semibold border border-emerald-200 transition-colors cursor-pointer"
              >
                Pull Web Intel
              </button>
            )}
            {onClearPrefilledContext && (
              <button
                type="button"
                onClick={onClearPrefilledContext}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded hover:bg-slate-100 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recording Console (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Audio Debrief</h2>
            </div>

            {/* Hands-free toggle */}
            <button
              type="button"
              onClick={() => setHandsFreeAutoPilot(!handsFreeAutoPilot)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                handsFreeAutoPilot
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold"
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
              title="Automatically processes debrief when you stop speaking"
            >
              <Zap className={`w-3 h-3 ${handsFreeAutoPilot ? "text-emerald-600 fill-emerald-600" : "text-slate-400"}`} />
              <span>Auto-Pilot {handsFreeAutoPilot ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Central Recording Console */}
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              )}
              <button
                type="button"
                onClick={isRecording ? () => stopRecording(false) : startRecording}
                disabled={isProcessing || isAutoSimulating}
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer relative z-10 ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-300 shadow-rose-600/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25"
                }`}
                aria-label={isRecording ? "Stop recording debrief" : "Start recording voice memo debrief"}
              >
                {isRecording ? (
                  <>
                    <Square className="w-7 h-7 fill-current mb-0.5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-8 h-8 stroke-[2.2] mb-0.5 text-white" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Record</span>
                  </>
                )}
              </button>
            </div>

            {/* Timer & Live Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? "bg-rose-500 animate-pulse" : "bg-slate-300"
                }`}
              />
              <span className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {formatTime(recordingDuration)}
              </span>
              <span className="text-xs text-slate-500">
                {isRecording
                  ? handsFreeAutoPilot
                    ? "Listening... (auto-stops on silence)"
                    : "Listening..."
                  : "Tap mic to speak"}
              </span>
            </div>

            {/* Live Audio Visualizer */}
            {isRecording && (
              <div className="h-8 w-52 bg-slate-100 rounded-lg px-2 flex items-center justify-center gap-1 border border-slate-200 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => {
                  const factor = Math.sin((i / 20) * Math.PI) * (audioLevel / 100);
                  const barHeight = Math.max(4, Math.min(22, Math.round(factor * 22 + Math.random() * 4)));
                  return (
                    <div
                      key={i}
                      style={{ height: `${barHeight}px` }}
                      className="w-1 bg-emerald-500 rounded-full transition-all duration-75"
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Presets for Busy Brokers */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-medium text-slate-700">1-Tap Sample Debriefs:</span>
              <button
                type="button"
                onClick={handleAutoPilotHandsFreeDemo}
                disabled={isProcessing || isAutoSimulating}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Runs simulated voice memo without typing"
              >
                <Zap className="w-3 h-3 text-emerald-600" />
                <span>Simulate Hands-Free</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleLoadSampleDebrief(0)}
                className="p-2 text-left bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">1420 Market St</div>
                <div className="text-[11px] text-emerald-700 font-mono font-medium">$14.2M · SF Office</div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleDebrief(1)}
                className="p-2 text-left bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">88 Hudson St</div>
                <div className="text-[11px] text-emerald-700 font-mono font-medium">$4.85M · Penthouse</div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleDebrief(2)}
                className="p-2 text-left bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">Fremont Logistics</div>
                <div className="text-[11px] text-emerald-700 font-mono font-medium">50k SF · Industrial</div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSampleDebrief(3)}
                className="p-2 text-left bg-slate-50 hover:bg-emerald-50/60 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
              >
                <div className="font-semibold text-slate-900 truncate">555 California</div>
                <div className="text-[11px] text-emerald-700 font-mono font-medium">28k SF · HQ Lease</div>
              </button>
            </div>

            <div className="pt-2 text-center">
              {!showUpload ? (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                >
                  Or upload an audio recording file
                </button>
              ) : (
                <label className="text-xs text-emerald-700 hover:text-emerald-800 cursor-pointer inline-flex items-center gap-1.5 font-semibold">
                  {isTranscribing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>
                    {isTranscribing
                      ? `Transcribing ${fileName || "audio"}...`
                      : fileName || "Select audio file (.mp3, .wav, .m4a)"}
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={isTranscribing}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Debrief Transcript & Processing (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Debrief Transcript</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-mono">
                {transcript ? `${transcript.split(/\s+/).filter(Boolean).length} words` : "0 words"}
              </span>
              <button
                type="button"
                onClick={() => setShowCheatSheet(!showCheatSheet)}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors font-semibold cursor-pointer"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showCheatSheet ? "Hide Guide" : "Dictation Tips"}</span>
                {showCheatSheet ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Collapsible Dictation Tips (Easy on the eyes, unobtrusive) */}
          {showCheatSheet && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-800">
                  4 Key Points to Say in Your 60s Voice Memo:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTranscript(
                      "Property Address: \nPrincipal Counterparty (Buyer / Tenant): \nAgreed Terms (Price/Rent, Cap Rate, Term): \nConcessions / Due Diligence Window: \nImmediate Next Steps & Stakeholders to Email: "
                    )
                  }
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer"
                >
                  Insert template
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-700">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-emerald-700 font-semibold block">1. Deal & Counterparty:</span>
                  "Toured 1420 Market with Marcus Vance (Apex Horizon)..."
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-emerald-700 font-semibold block">2. Agreed Numbers:</span>
                  "Agreed on $14.2M, 6.35% cap, $450k deposit..."
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-emerald-700 font-semibold block">3. Timeline & Clauses:</span>
                  "30-day diligence, estoppel certificates required..."
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-emerald-700 font-semibold block">4. Action Next Steps:</span>
                  "Email Sarah at title, David for debt, draft PSA..."
                </div>
              </div>
            </div>
          )}

          {/* Speed & Anti-Saturation Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-600">Model Engine:</span>
              <div className="inline-flex rounded-lg p-0.5 bg-slate-200/80 border border-slate-200">
                <button
                  type="button"
                  onClick={() => onToggleSpeedMode && onToggleSpeedMode("turbo")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    speedMode === "turbo"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Claude at low effort: fastest responses for routine extraction"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Turbo</span>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSpeedMode && onToggleSpeedMode("balanced")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    speedMode === "balanced"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Claude at medium effort: deeper reasoning for complex deals"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Balanced</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastAiLatency && (
                <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  {lastAiLatency.cached
                    ? "⚡ Instant (Cache Hit)"
                    : `⚡ ${(lastAiLatency.ms / 1000).toFixed(1)}s · ${lastAiLatency.model.replace("claude-", "")}`}
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowSpeedArchitecture(!showSpeedArchitecture)}
                className="text-[11px] text-slate-500 hover:text-emerald-700 flex items-center gap-1 transition-colors cursor-pointer font-medium"
                title="View architectural speed & anti-saturation improvements"
              >
                <Info className="w-3 h-3" />
                <span className="hidden sm:inline">Anti-Saturation Shield</span>
                {showSpeedArchitecture ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Speed & Anti-Saturation Architecture Card */}
          {showSpeedArchitecture && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-3 animate-in fade-in text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                  <span>5 Architectural Techniques Keeping Claude Fast & Saturation-Proof</span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded font-bold">
                  Active
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] text-slate-700">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                  <strong className="text-emerald-900 block mb-0.5">1. Effort Control (low / medium)</strong>
                  Turbo runs Claude at low effort so routine extraction returns quickly; Balanced uses medium effort for deeper deal analysis.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                  <strong className="text-emerald-900 block mb-0.5">2. Concurrent Parallel Grounding (Promise.all)</strong>
                  Instead of awaiting debrief extraction then sequentially awaiting Claude web search, both run simultaneously in parallel.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                  <strong className="text-emerald-900 block mb-0.5">3. 70% Context Pruning (Anti-TPM Saturation)</strong>
                  Passes compact CRM schemas instead of raw verbose database dumps, preventing Tokens-Per-Minute quota exhaustion.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs">
                  <strong className="text-emerald-900 block mb-0.5">4. Instant In-Memory Cache (&lt;5ms / 0 Tokens)</strong>
                  Repeated debriefs and neighborhood queries resolve immediately from memory cache without consuming any API quota.
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-xs md:col-span-2">
                  <strong className="text-emerald-900 block mb-0.5">5. Automatic Retries & Server-Side Fallback</strong>
                  If the Claude API returns 429 (rate limited) or 5xx (overloaded), the SDK retries with exponential backoff, and declined requests are re-run on a fallback model server-side.
                </div>
              </div>
            </div>
          )}

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={8}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-400 resize-none transition-all"
            placeholder="Speak your debrief above or type recap notes here (e.g. 'Just met with Marcus Vance on 1420 Market Street. Agreed on $14.2M purchase price, 6.35% cap rate, $450k earnest deposit. Need to email Sarah Chen at First American Title to open escrow, David Steinberg for debt terms, and Robert Hawthorne for PSA drafting...')"
          />

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleRunIntelligence}
            disabled={isProcessing || isAutoSimulating || !transcript.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Broker Buddy Extracting Terms & Matching CRM...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Process Debrief, Match CRM & Draft Emails</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
