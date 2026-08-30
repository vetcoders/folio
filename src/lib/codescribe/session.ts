import { formatTranscript, transcribeAudio } from "@/lib/ai";
import { type AsrErrorKind, mintSessionId } from "./events";
import { StreamPostProcessor } from "./postprocess";

/**
 * Folio in-browser dictation. This is NOT the codescribe engine.
 *
 * Mapped against vetcoders/codescribe @ 519159d (dbxms-runtime-claude):
 *   Codescribe thrones: RecordingController, AcousticLedger, TranscriptReducer,
 *   Transcript Bus, DeliveryRoute. Folio owns none of them.
 *
 * What this file actually does:
 *   - Web Speech API as a live canvas analog (often cloud, never Apple L0)
 *   - xAI file STT only when that canvas produced nothing (gap-fill, not L1)
 *   - Light+/lexicon as string cosmetics, not occurrence-bound L2
 *
 * SpeechRecognition.isFinal is a hypothesis close, not a ledger seal.
 * Join with codescribe at paste / Transcript Bus — never at the microphone.
 */

export type DictationStatus = "idle" | "requesting" | "listening" | "sealing" | "error";
export type EngineChip = "web-speech" | "gap-fill";

export type DictationSnapshot = {
  status: DictationStatus;
  sessionId: string | null;
  partial: string;
  committed: string;
  error: string | null;
  errorKind: AsrErrorKind | null;
  elapsedMs: number;
  level: number;
  bins: number[];
  liveAvailable: boolean;
  engine: EngineChip;
  sealedCount: number;
};

const idle: DictationSnapshot = {
  status: "idle",
  sessionId: null,
  partial: "",
  committed: "",
  error: null,
  errorKind: null,
  elapsedMs: 0,
  level: 0,
  bins: Array.from({ length: 24 }, () => 0.08),
  liveAvailable: false,
  engine: "web-speech",
  sealedCount: 0,
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechRecEvent) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognition(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "audio/webm";
}

export type DictationHandlers = {
  onCommit: (text: string) => void;
};

export function createDictationEngine(handlers: DictationHandlers) {
  let snapshot: DictationSnapshot = {
    ...idle,
    liveAvailable: Boolean(getSpeechRecognition()),
  };
  const listeners = new Set<(s: DictationSnapshot) => void>();
  const processor = new StreamPostProcessor();

  let rec: MediaRecorder | null = null;
  let recognition: SpeechRec | null = null;
  let chunks: Blob[] = [];
  let stream: MediaStream | null = null;
  let analyser: AnalyserNode | null = null;
  let audioCtx: AudioContext | null = null;
  let raf = 0;
  let tick: number | null = null;
  let startedAt = 0;
  let wantStop = false;
  let mime = "audio/webm";
  const freq = new Uint8Array(64);

  const emit = (patch: Partial<DictationSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    for (const l of listeners) l(snapshot);
  };

  const stopMeters = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (tick) window.clearInterval(tick);
    tick = null;
  };

  const teardownAudio = () => {
    stopMeters();
    rec = null;
    recognition = null;
    analyser = null;
    void audioCtx?.close();
    audioCtx = null;
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  const pumpLevel = () => {
    if (!analyser) return;
    const time = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(time);
    let sum = 0;
    for (let i = 0; i < time.length; i += 1) {
      const v = (time[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.min(1, Math.sqrt(sum / time.length) * 4);
    analyser.getByteFrequencyData(freq);
    const bins = Array.from({ length: 24 }, (_, i) => {
      const slice = freq.slice(i * 2, i * 2 + 2);
      const avg = slice.reduce((a, b) => a + b, 0) / Math.max(1, slice.length) / 255;
      return Math.max(0.06, Math.min(1, avg * 1.4 + rms * 0.25));
    });
    emit({ level: rms, bins, elapsedMs: Date.now() - startedAt });
    raf = requestAnimationFrame(pumpLevel);
  };

  const seal = (raw: string): string | null => {
    return processor.process(raw, { final: true, leftContext: snapshot.committed });
  };

  const startLive = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.continuous = true;
    r.interimResults = true;
    r.lang = "pl-PL";
    r.onresult = (ev) => {
      let partial = "";
      const finals: string[] = [];
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const res = ev.results[i];
        const raw = res[0]?.transcript ?? "";
        if (res.isFinal) {
          const cleaned = seal(raw);
          if (cleaned) finals.push(cleaned);
        } else {
          const cleaned = processor.process(raw, { final: false });
          if (cleaned) partial = cleaned;
        }
      }
      if (finals.length) {
        const block = finals.join(" ");
        const committed = snapshot.committed ? `${snapshot.committed} ${block}` : block;
        emit({
          committed,
          partial: "",
          sealedCount: snapshot.sealedCount + finals.length,
          engine: "web-speech",
        });
        handlers.onCommit(block);
      } else if (partial) {
        emit({ partial, engine: "web-speech" });
      }
    };
    r.onerror = (ev) => {
      if (ev.error === "no-speech" || ev.error === "aborted") return;
      const kind: AsrErrorKind =
        ev.error === "not-allowed" ? "auth" : ev.error === "network" ? "transport" : "protocol";
      emit({ errorKind: kind });
    };
    r.onend = () => {
      if (snapshot.status === "listening" && !wantStop) {
        try {
          r.start();
        } catch {
          /* already started */
        }
      }
    };
    recognition = r;
    r.start();
  };

  async function start() {
    if (snapshot.status === "listening" || snapshot.status === "requesting") return;
    wantStop = false;
    chunks = [];
    processor.stats = {
      inputChunks: 0,
      outputChunks: 0,
      droppedChunks: 0,
      lexiconRewrites: 0,
      repetitionCleanups: 0,
    };
    emit({
      status: "requesting",
      sessionId: mintSessionId(),
      partial: "",
      committed: "",
      error: null,
      errorKind: null,
      elapsedMs: 0,
      level: 0,
      sealedCount: 0,
      engine: "web-speech",
    });

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      emit({
        status: "error",
        error: "Brak dostępu do mikrofonu.",
        errorKind: "auth",
      });
      return;
    }

    mime = pickMime();
    rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    rec.start(250);

    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    startedAt = Date.now();
    emit({ status: "listening", liveAvailable: Boolean(getSpeechRecognition()) });
    pumpLevel();
    tick = window.setInterval(() => emit({ elapsedMs: Date.now() - startedAt }), 250);

    try {
      startLive();
    } catch {
      emit({ liveAvailable: false });
    }
  }

  async function stop() {
    if (snapshot.status !== "listening" && snapshot.status !== "requesting") return;
    wantStop = true;
    emit({ status: "sealing", partial: snapshot.partial });

    if (snapshot.partial.trim()) {
      const sealed = seal(snapshot.partial);
      if (sealed) {
        const committed = snapshot.committed ? `${snapshot.committed} ${sealed}` : sealed;
        emit({
          committed,
          partial: "",
          sealedCount: snapshot.sealedCount + 1,
        });
        handlers.onCommit(sealed);
      }
    }

    const recorder = rec;
    const recStop = new Promise<void>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.onstop = () => resolve();
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });

    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }

    await recStop;
    teardownAudio();

    // Gap-fill only: cloud STT is not stop-time authority. Used when the live
    // canvas produced nothing (Safari/Firefox without Web Speech, or silence
    // that the recognizer skipped).
    if (!snapshot.committed.trim() && chunks.length > 0) {
      try {
        const blob = new Blob(chunks, { type: mime });
        if (blob.size > 800) {
          const audioBase64 = await blobToBase64(blob);
          const stt = await transcribeAudio({
            data: { audioBase64, mimeType: mime.split(";")[0], language: "pl" },
          });
          if (stt.ok && stt.text.trim()) {
            const formatted = await formatTranscript({ data: { text: stt.text } });
            const text = (formatted.ok ? formatted.text : stt.text).trim();
            if (text) {
              emit({ committed: text, engine: "gap-fill", sealedCount: 1 });
              handlers.onCommit(text);
            }
          }
        }
      } catch {
        /* keep empty */
      }
    }

    emit({
      status: "idle",
      sessionId: null,
      partial: "",
      committed: "",
      elapsedMs: 0,
      level: 0,
      bins: idle.bins,
      sealedCount: 0,
    });
    chunks = [];
  }

  function cancel() {
    wantStop = true;
    try {
      recognition?.abort();
    } catch {
      /* ignore */
    }
    try {
      rec?.stop();
    } catch {
      /* ignore */
    }
    teardownAudio();
    emit({
      status: "idle",
      sessionId: null,
      partial: "",
      committed: "",
      elapsedMs: 0,
      level: 0,
      bins: idle.bins,
      error: null,
      sealedCount: 0,
    });
  }

  return {
    subscribe(fn: (s: DictationSnapshot) => void) {
      listeners.add(fn);
      fn(snapshot);
      return () => listeners.delete(fn);
    },
    getSnapshot: () => snapshot,
    start,
    stop,
    cancel,
  };
}

export type DictationEngine = ReturnType<typeof createDictationEngine>;
