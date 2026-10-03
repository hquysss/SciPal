type PronunciationResult = 'spoken' | 'unavailable' | 'unsupported' | 'superseded';
let latestRequest = 0;

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
    const timeout = setTimeout(() => finish(synth.getVoices()), 1000);
    synth.addEventListener('voiceschanged', changed);
    changed();
  });
}

export async function speakTerm(text: string, lang: 'en' | 'vi'): Promise<PronunciationResult> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return 'unsupported';
  }
  const request = ++latestRequest;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voices = await loadedVoices(synth);
  if (request !== latestRequest) return 'superseded';

  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const normalized = (value: string) => value.toLowerCase().replaceAll('_', '-');
  const matching = voices.filter((voice) => normalized(voice.lang).split('-')[0] === lang);
  const selected = matching.find((voice) => normalized(voice.lang) === normalized(locale))
    ?? matching.find((voice) => voice.default)
    ?? matching[0];
  if (!selected) return 'unavailable';

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selected.lang;
  utterance.voice = selected;
  utterance.rate = 0.9;
  synth.speak(utterance);
  return 'spoken';
}
