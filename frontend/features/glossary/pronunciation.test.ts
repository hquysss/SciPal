import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { speakTerm } from './pronunciation';

function voice(lang: string, isDefault = false): SpeechSynthesisVoice {
  return { lang, name: lang, voiceURI: lang, default: isDefault, localService: true };
}
const english = voice('en-US', true);
const vietnamese = voice('vi-VN');
const getVoices = vi.fn();
const speak = vi.fn();
const cancel = vi.fn();
let synth: EventTarget;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  synth = Object.assign(new EventTarget(), { getVoices, speak, cancel });
  vi.stubGlobal('window', { speechSynthesis: synth });
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = '';
    rate = 1;
    voice: SpeechSynthesisVoice | null = null;
    constructor(public text: string) {}
  });
  getVoices.mockReturnValue([english, vietnamese]);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('term pronunciation', () => {
  it('pins the Vietnamese voice even when the default voice is English', async () => {
    expect(await speakTerm('Alen', 'vi')).toBe('spoken');
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'Alen', lang: 'vi-VN', voice: vietnamese });
  });
  it('uses an English voice when switching from Vietnamese', async () => {
    await speakTerm('Alen', 'vi');
    await speakTerm('Allele', 'en');
    expect(speak.mock.calls[1][0]).toMatchObject({ text: 'Allele', lang: 'en-US', voice: english });
    expect(cancel).toHaveBeenCalledTimes(2);
  });
  it('accepts another dialect only within the requested language', async () => {
    const british = voice('en-GB');
    getVoices.mockReturnValue([vietnamese, british]);
    await speakTerm('Allele', 'en');
    expect(speak.mock.calls[0][0].voice).toBe(british);
  });
  it('does not read Vietnamese with an English fallback voice', async () => {
    getVoices.mockReturnValue([english]);
    expect(await speakTerm('Alen', 'vi')).toBe('unavailable');
    expect(speak).not.toHaveBeenCalled();
  });
  it('waits for delayed browser voices before selecting the language', async () => {
    getVoices.mockReturnValue([]);
    const pending = speakTerm('Alen', 'vi');
    getVoices.mockReturnValue([english, vietnamese]);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(await pending).toBe('spoken');
    expect(speak.mock.calls[0][0].voice).toBe(vietnamese);
  });
  it('reports unavailable when browser voices never load', async () => {
    getVoices.mockReturnValue([]);
    const pending = speakTerm('Alen', 'vi');
    await vi.runAllTimersAsync();
    expect(await pending).toBe('unavailable');
    expect(speak).not.toHaveBeenCalled();
  });
  it('does not play an older language request after a newer click', async () => {
    getVoices.mockReturnValue([]);
    const earlier = speakTerm('Alen', 'vi');
    const latest = speakTerm('Allele', 'en');
    getVoices.mockReturnValue([english, vietnamese]);
    synth.dispatchEvent(new Event('voiceschanged'));
    expect(await earlier).toBe('superseded');
    expect(await latest).toBe('spoken');
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0].text).toBe('Allele');
  });
});
