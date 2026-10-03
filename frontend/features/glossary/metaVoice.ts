// Pronunciation for devices whose browser has no voice for the language: Meta's MMS-TTS models
// (facebook/mms-tts-vie and -eng, ONNX builds by Xenova), run in the browser. Each downloads once
// on first use and the browser caches it. The models' licence is CC-BY-NC 4.0 (non-commercial).
type Language = 'en' | 'vi';
const MODELS: Record<Language, string> = { en: 'Xenova/mms-tts-eng', vi: 'Xenova/mms-tts-vie' };

type Synthesizer = (text: string) => Promise<{ audio: Float32Array; sampling_rate: number }>;

const synthesizers: Partial<Record<Language, Promise<Synthesizer>>> = {};
let context: AudioContext | null = null;
let playing: AudioBufferSourceNode | null = null;

function loadSynthesizer(lang: Language): Promise<Synthesizer> {
  synthesizers[lang] ??= import('@huggingface/transformers')
    .then(({ pipeline }) => pipeline('text-to-speech', MODELS[lang], { dtype: 'q8' }) as unknown as Promise<Synthesizer>)
    .catch((error) => {
      delete synthesizers[lang]; // a failed download (offline) is retried on the next click
      throw error;
    });
  return synthesizers[lang]!;
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
    const first = !synthesizers[lang];
    if (first) onLoading?.(true);
    const synthesize = await loadSynthesizer(lang).finally(() => { if (first) onLoading?.(false); });
    // The model was trained on lower-case text.
    const { audio, sampling_rate } = await synthesize(text.toLowerCase());
    if (!isCurrent()) return 'spoken';

    context ??= new AudioContext();
    if (context.state === 'suspended') await context.resume();
    const buffer = context.createBuffer(1, audio.length, sampling_rate);
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
