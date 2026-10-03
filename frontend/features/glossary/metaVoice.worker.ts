// Runs Meta's MMS-TTS models off the main thread: loading the ONNX session and synthesising are
// heavy WebAssembly work that froze the page for seconds when done on the UI thread.
import { pipeline } from '@huggingface/transformers';

/** `warm` loads the model and runs it once without speaking, so the first real click is quick. */
export type WorkerRequest = { id: number; lang: 'en' | 'vi'; text: string; warm?: boolean };
export type WorkerReply =
  | { id: number; type: 'loading'; loading: boolean }
  | { id: number; type: 'audio'; audio: Float32Array; samplingRate: number }
  | { id: number; type: 'warmed' }
  | { id: number; type: 'error' };

type Synthesizer = (text: string) => Promise<{ audio: Float32Array; sampling_rate: number }>;

const MODELS = { en: 'Xenova/mms-tts-eng', vi: 'Xenova/mms-tts-vie' } as const;
const synthesizers: Partial<Record<'en' | 'vi', Promise<Synthesizer>>> = {};
const ready: Partial<Record<'en' | 'vi', boolean>> = {};

const reply = (message: WorkerReply, transfer: Transferable[] = []) =>
  (self as unknown as { postMessage(m: WorkerReply, t: Transferable[]): void }).postMessage(message, transfer);

function load(lang: 'en' | 'vi'): Promise<Synthesizer> {
  synthesizers[lang] ??= (pipeline('text-to-speech', MODELS[lang], { dtype: 'q8' }) as unknown as Promise<Synthesizer>)
    .then(async (synthesize) => {
      await synthesize('a'); // the first run is slow: it compiles the kernels
      ready[lang] = true;
      return synthesize;
    })
    .catch((error) => {
      delete synthesizers[lang]; // a failed download (offline) is retried on the next click
      throw error;
    });
  return synthesizers[lang]!;
}

self.onmessage = async ({ data: { id, lang, text, warm } }: MessageEvent<WorkerRequest>) => {
  try {
    // A click that arrives while the model is still loading or warming shows the loading notice.
    const waiting = !ready[lang] && !warm;
    if (waiting) reply({ id, type: 'loading', loading: true });
    const synthesize = await load(lang).finally(() => { if (waiting) reply({ id, type: 'loading', loading: false }); });
    if (warm) return reply({ id, type: 'warmed' });
    // The models were trained on lower-case text.
    const { audio, sampling_rate } = await synthesize(text.toLowerCase());
    reply({ id, type: 'audio', audio, samplingRate: sampling_rate }, [audio.buffer]);
  } catch {
    reply({ id, type: 'error' });
  }
};
