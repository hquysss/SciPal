// Pronunciation for devices whose browser has no voice for the language: Meta's MMS-TTS models
// (facebook/mms-tts-vie and -eng, ONNX builds by Xenova), run in the browser in a Web Worker so the
// page stays responsive. Each model downloads once on first use and the browser caches it. The
// models' licence is CC-BY-NC 4.0 (non-commercial).
import type { WorkerReply, WorkerRequest } from './metaVoice.worker';

type Language = 'en' | 'vi';
type Waiting = { onLoading?: (loading: boolean) => void; resolve: (audio: { audio: Float32Array; samplingRate: number }) => void; reject: () => void };

let worker: Worker | null = null;
let nextId = 0;
const waiting = new Map<number, Waiting>();
let context: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  const created = new Worker(new URL('./metaVoice.worker.ts', import.meta.url), { type: 'module' });
  created.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
    const request = waiting.get(data.id);
    if (!request) return;
    if (data.type === 'loading') return request.onLoading?.(data.loading);
    waiting.delete(data.id);
    if (data.type === 'audio') request.resolve({ audio: data.audio, samplingRate: data.samplingRate });
    else request.reject();
  };
  created.onerror = () => {
    // The worker itself failed (script or import error): fail every pending request and start fresh next time.
    for (const request of waiting.values()) { request.onLoading?.(false); request.reject(); }
    waiting.clear();
    created.terminate();
    worker = null;
  };
  worker = created;
  return created;
}

function synthesize(text: string, lang: Language, onLoading?: (loading: boolean) => void) {
  return new Promise<{ audio: Float32Array; samplingRate: number }>((resolve, reject) => {
    const id = nextId++;
    waiting.set(id, { onLoading, resolve, reject });
    const request: WorkerRequest = { id, lang, text };
    getWorker().postMessage(request);
  });
}

export function stopMetaVoice() {
  try { playing?.stop(); } catch { /* already finished */ }
  playing = null;
}

/** Speaks `text` with the Meta model; 'failed' when it cannot load or play. `isCurrent` drops audio the user has moved on from. */
export async function speakWithMeta(
  text: string,
  lang: Language,
  { onLoading, isCurrent }: { onLoading?: (loading: boolean) => void; isCurrent: () => boolean },
): Promise<'spoken' | 'failed'> {
  try {
    const { audio, samplingRate } = await synthesize(text, lang, onLoading);
    if (!isCurrent()) return 'spoken';

    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    const buffer = context.createBuffer(1, audio.length, samplingRate);
    buffer.copyToChannel(audio as Float32Array<ArrayBuffer>, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    stopMetaVoice();
    source.start();
    playing = source;
    return 'spoken';
  } catch {
    return 'failed';
  }
}
