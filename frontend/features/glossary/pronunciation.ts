import { speakWithMeta, stopMetaVoice, warmMetaVoice } from './metaVoice';

type PronunciationResult = 'spoken' | 'unavailable' | 'unsupported' | 'superseded';
let latestRequest = 0;
// How long to wait for the browser's voice list. After one full wait that found nothing, later clicks wait briefly.
let voiceWait = 1000;

function loadedVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length) return Promise.resolve(voices);

  return new Promise((resolve) => {
    const finish = (available: SpeechSynthesisVoice[]) => {
      clearTimeout(timeout);
      synth.removeEventListener('voiceschanged', changed);
      resolve(available);
    };
    const changed = () => {
      const available = synth.getVoices();
      if (available.length) finish(available);
    };
    const timeout = setTimeout(() => {
      const available = synth.getVoices();
      if (!available.length) voiceWait = 150;
      finish(available);
    }, voiceWait);
    synth.addEventListener('voiceschanged', changed);
    changed();
  });
}

function browserVoice(voices: SpeechSynthesisVoice[], lang: 'en' | 'vi') {
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const normalized = (value: string) => value.toLowerCase().replaceAll('_', '-');
  const matching = voices.filter((voice) => normalized(voice.lang).split('-')[0] === lang);
  return matching.find((voice) => normalized(voice.lang) === normalized(locale))
    ?? matching.find((voice) => voice.default)
    ?? matching[0];
}

/**
 * Prepares Meta's voice for each language the browser cannot speak, so the first click is quick.
 * Skipped on Data Saver, because the models are a download of tens of megabytes.
 */
export async function warmSpeech(): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  const voices = await loadedVoices(window.speechSynthesis);
  for (const lang of ['vi', 'en'] as const) {
    if (!browserVoice(voices, lang)) warmMetaVoice(lang);
  }
}

/** `onLoading` reports the one-time download of Meta's voice model, used when the browser has no voice for the language. */
export async function speakTerm(text: string, lang: 'en' | 'vi', onLoading?: (loading: boolean) => void): Promise<PronunciationResult> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return 'unsupported';
  }
  const request = ++latestRequest;
  const synth = window.speechSynthesis;
  synth.cancel();
  stopMetaVoice();
  const voices = await loadedVoices(synth);
  if (request !== latestRequest) return 'superseded';

  const selected = browserVoice(voices, lang);
  if (!selected) {
    const result = await speakWithMeta(text, lang, { onLoading, isCurrent: () => request === latestRequest });
    if (request !== latestRequest) return 'superseded';
    return result === 'spoken' ? 'spoken' : 'unavailable';
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selected.lang;
  utterance.voice = selected;
  utterance.rate = 0.9;
  synth.speak(utterance);
  return 'spoken';
}
