// Runs Meta's MMS-TTS models off the main thread: loading the ONNX session and synthesising are
// heavy WebAssembly work that froze the page for seconds when done on the UI thread.
import { pipeline } from '@huggingface/transformers';

export type WorkerRequest = { id: number; lang: 'en' | 'vi'; text: string };
export type WorkerReply =
  | { id: number; type: 'loading'; loading: boolean }
  | { id: number; type: 'audio'; audio: Float32Array; samplingRate: number }
  | { id: number; type: 'error' };

type Synthesizer = (text: string) => Promise<{ audio: Float32Array; sampling_rate: number }>;

const MODELS = { en: 'Xenova/mms-tts-eng', vi: 'Xenova/mms-tts-vie' } as const;
const synthesizers: Partial<Record<'en' | 'vi', Promise<Synthesizer>>> = {};

const reply = (message: WorkerReply, transfer: Transferable[] = []) =>
  (self as unknown as { postMessage(m: WorkerReply, t: Transferable[]): void }).postMessage(message, transfer);

self.onmessage = async ({ data: { id, lang, text } }: MessageEvent<WorkerRequest>) => {
  try {
    const first = !synthesizers[lang];
    if (first) {
      reply({ id, type: 'loading', loading: true });
      synthesizers[lang] = (pipeline('text-to-speech', MODELS[lang], { dtype: 'q8' }) as unknown as Promise<Synthesizer>).catch((error) => {
        delete synthesizers[lang]; // a failed download (offline) is retried on the next click
        throw error;
      });
    }
    const synthesize = await synthesizers[lang]!.finally(() => { if (first) reply({ id, type: 'loading', loading: false }); });
    // The models were trained on lower-case text.
    const { audio, sampling_rate } = await synthesize(text.toLowerCase());
    reply({ id, type: 'audio', audio, samplingRate: sampling_rate }, [audio.buffer]);
  } catch {
    reply({ id, type: 'error' });
  }
};
