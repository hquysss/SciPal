// A spoken conversation with the Gemini Live API, straight from the browser. It runs in short
// segments: the backend (routes/tutor.ts, POST /api/tutor/voice) pays each one from the student's
// voice minutes and hands out a one-use token locked to the tutor's instruction that expires with
// the segment. Shortly before a segment ends the next one is asked for; its new connection starts
// with the conversation so far, the microphone moves over, and the old one is let go. When no
// minutes are left the conversation ends with the last segment.
//
// Audio: the microphone goes up as 16 kHz 16-bit PCM, the tutor's voice comes back as 24 kHz PCM
// and is played in order; when the student talks over the tutor, what is still queued is dropped.

export type VoiceState = 'connecting' | 'listening' | 'speaking' | 'ended';
export type TranscriptLine = { who: 'student' | 'tutor'; text: string };
export type VoiceGrant = { token: string; model: string; socketUrl: string; maxSeconds: number };
/** The next segment, or why there is none (no minutes left, or another failure). */
export type GrantResult = { ok: true; grant: VoiceGrant } | { ok: false; outOfMinutes: boolean };

export type VoiceHandlers = {
  onState: (state: VoiceState) => void;
  /** No more segments will come: the conversation ends when this one does, in about `seconds`. */
  onLastSegment: (seconds: number) => void;
  /** The newest words of the current turn, appended as they arrive. */
  onTranscript: (who: TranscriptLine['who'], text: string) => void;
  onTurnEnd: () => void;
  onError: (reason: 'microphone' | 'connection') => void;
  /** How loud each side is right now, 0…1 (the student's microphone, the tutor's voice). */
  onLevel?: (who: TranscriptLine['who'], level: number) => void;
  /** While true the microphone is not sent (the student muted it). */
  isMuted?: () => boolean;
};

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;

// Runs on the audio thread: averages the device rate down to 16 kHz, packs 16-bit PCM and posts
// about 100 ms at a time.
const CAPTURE_WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / ${INPUT_RATE};
    this.acc = 0; this.sum = 0; this.n = 0;
    this.out = new Int16Array(${INPUT_RATE / 10}); this.i = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let k = 0; k < ch.length; k++) {
      this.sum += ch[k]; this.n++; this.acc++;
      if (this.acc >= this.ratio) {
        const v = Math.max(-1, Math.min(1, this.sum / this.n));
        this.out[this.i++] = v < 0 ? v * 0x8000 : v * 0x7fff;
        this.acc -= this.ratio; this.sum = 0; this.n = 0;
        if (this.i === this.out.length) { this.port.postMessage(this.out.buffer.slice(0)); this.i = 0; }
      }
    }
    return true;
  }
}
registerProcessor('scipal-capture', Capture);
`;

export function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** How loud a chunk of 16-bit PCM is, 0…1 (RMS, lifted so speech fills the range). */
export function micLevel(buffer: ArrayBuffer): number {
  const samples = new Int16Array(buffer);
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const v of samples) sum += (v / 0x8000) ** 2;
  return Math.min(1, Math.sqrt(sum / samples.length) * 5);
}

/** 16-bit little-endian PCM (base64) as samples in -1…1. */
export function pcmToFloats(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) view.setUint8(i, binary.charCodeAt(i));
  const out = new Float32Array(new ArrayBuffer((binary.length >> 1) * 4));
  for (let i = 0; i < out.length; i++) out[i] = view.getInt16(i * 2, true) / 0x8000;
  return out;
}

type ServerMessage = {
  setupComplete?: unknown;
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
};

/** Ask for the next segment this long before the current one runs out. */
const HANDOFF_LEAD_SECONDS = 15;
/** The conversation replayed to a new segment: the latest turns only. */
const HISTORY_TURNS = 40;

/** The conversation so far as Live history turns (student → user, tutor → model). */
export function historyTurns(lines: TranscriptLine[]) {
  return lines
    .filter((line) => line.text.trim())
    .slice(-HISTORY_TURNS)
    .map((line) => ({ role: line.who === 'tutor' ? 'model' : 'user', parts: [{ text: line.text.trim() }] }));
}

/**
 * Starts the conversation: the first segment comes from `nextGrant`, and so does each following
 * one. `history` returns the transcript so far, replayed to each new segment. Returns the function
 * that ends it (idempotent).
 */
export async function startConversation(
  nextGrant: () => Promise<GrantResult>,
  history: () => TranscriptLine[],
  handlers: VoiceHandlers,
): Promise<() => void> {
  let ended = false;
  let stream: MediaStream | null = null;
  let input: AudioContext | null = null;
  let output: AudioContext | null = null;
  let current: WebSocket | null = null;
  const sockets = new Set<WebSocket>();
  const timers = new Set<number>();
  let playhead = 0;
  const playing = new Set<AudioBufferSourceNode>();
  let tutorSpeaking = false;
  let analyser: AnalyserNode | null = null;
  let meterFrame = 0;

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
  };

  const stopPlayback = () => {
    for (const source of playing) {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    }
    playing.clear();
    playhead = 0;
  };

  const end = () => {
    if (ended) return;
    ended = true;
    timers.forEach((id) => window.clearTimeout(id));
    window.cancelAnimationFrame(meterFrame);
    stopPlayback();
    stream?.getTracks().forEach((track) => track.stop());
    void input?.close().catch(() => {});
    void output?.close().catch(() => {});
    sockets.forEach((ws) => {
      if (ws.readyState <= WebSocket.OPEN) ws.close();
    });
    handlers.onState('ended');
  };

  const play = (base64: string) => {
    if (!output) return;
    const samples = pcmToFloats(base64);
    const buffer = output.createBuffer(1, samples.length, OUTPUT_RATE);
    buffer.copyToChannel(samples, 0);
    const source = output.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser ?? output.destination);
    playhead = Math.max(playhead, output.currentTime);
    source.start(playhead);
    playhead += buffer.duration;
    playing.add(source);
    handlers.onState('speaking');
    source.onended = () => {
      playing.delete(source);
      if (playing.size === 0 && !ended) handlers.onState('listening');
    };
  };

  /** Opens one segment's socket; resolves once it is ready for audio (null if it failed). */
  const open = (grant: VoiceGrant): Promise<WebSocket | null> =>
    new Promise((resolve) => {
      const ws = new WebSocket(`${grant.socketUrl}?access_token=${encodeURIComponent(grant.token)}`);
      sockets.add(ws);
      let ready = false;
      ws.onopen = () => ws.send(JSON.stringify({ setup: { model: `models/${grant.model}` } }));
      ws.onmessage = async (event) => {
        const text = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
        let message: ServerMessage;
        try {
          message = JSON.parse(text) as ServerMessage;
        } catch {
          return;
        }
        if (message.setupComplete && !ready) {
          ready = true;
          // What was said in earlier segments, so the tutor carries on rather than starting over.
          const turns = historyTurns(history());
          if (turns.length) ws.send(JSON.stringify({ clientContent: { turns, turnComplete: false } }));
          resolve(ws);
        }
        const content = message.serverContent;
        if (!content) return;
        if (content.interrupted) stopPlayback();
        for (const part of content.modelTurn?.parts ?? []) {
          if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) {
            tutorSpeaking = true;
            play(part.inlineData.data);
          }
        }
        if (content.inputTranscription?.text) handlers.onTranscript('student', content.inputTranscription.text);
        if (content.outputTranscription?.text) handlers.onTranscript('tutor', content.outputTranscription.text);
        if (content.turnComplete) {
          tutorSpeaking = false;
          handlers.onTurnEnd();
        }
      };
      ws.onerror = () => {
        if (!ready) resolve(null);
      };
      ws.onclose = () => {
        sockets.delete(ws);
        if (!ready) resolve(null);
        // The live segment closing (its time is up, or the line dropped) ends the conversation;
        // a segment already handed over just goes away.
        if (ws === current) end();
      };
    });

  /** Lets the old segment finish the tutor's sentence, then closes it. */
  const retire = (ws: WebSocket, deadlineMs: number) => {
    const started = Date.now();
    const check = () => {
      if (ws.readyState > WebSocket.OPEN) return;
      if (!tutorSpeaking || Date.now() - started > deadlineMs) ws.close();
      else later(250, check);
    };
    check();
  };

  /** Runs a ready segment and arranges the next one before it expires. */
  const run = (ws: WebSocket, grant: VoiceGrant) => {
    const previous = current;
    current = ws;
    if (previous) retire(previous, HANDOFF_LEAD_SECONDS * 1000 - 2000);
    const leadMs = Math.max(0, (grant.maxSeconds - HANDOFF_LEAD_SECONDS) * 1000);
    later(leadMs, async () => {
      if (ended) return;
      const next = await nextGrant();
      if (ended) return;
      if (!next.ok) {
        // No more minutes (or no segment): this one runs out and the conversation ends with it.
        handlers.onLastSegment(HANDOFF_LEAD_SECONDS);
        if (!next.outOfMinutes) handlers.onError('connection');
        return;
      }
      const ready = await open(next.grant);
      if (ended) {
        ready?.close();
        return;
      }
      if (ready) run(ready, next.grant);
      else handlers.onError('connection');
    });
  };

  handlers.onState('connecting');
  const first = await nextGrant();
  if (!first.ok) {
    end();
    return end;
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  } catch {
    handlers.onError('microphone');
    end();
    return end;
  }
  input = new AudioContext();
  output = new AudioContext({ sampleRate: OUTPUT_RATE });
  // The tutor's voice passes through a meter on its way out, read once a frame while it plays.
  analyser = output.createAnalyser();
  analyser.fftSize = 512;
  analyser.connect(output.destination);
  const wave = new Uint8Array(analyser.fftSize);
  const meter = () => {
    if (ended || !analyser) return;
    if (playing.size > 0) {
      analyser.getByteTimeDomainData(wave);
      let sum = 0;
      for (const v of wave) sum += ((v - 128) / 128) ** 2;
      handlers.onLevel?.('tutor', Math.min(1, Math.sqrt(sum / wave.length) * 4));
    }
    meterFrame = window.requestAnimationFrame(meter);
  };
  meterFrame = window.requestAnimationFrame(meter);
  const moduleUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }));
  try {
    await input.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
  const capture = new AudioWorkletNode(input, 'scipal-capture');
  input.createMediaStreamSource(stream).connect(capture);
  // The microphone always feeds the live segment.
  capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (handlers.isMuted?.()) {
      handlers.onLevel?.('student', 0);
      return;
    }
    handlers.onLevel?.('student', micLevel(event.data));
    if (current?.readyState !== WebSocket.OPEN) return;
    current.send(JSON.stringify({ realtimeInput: { audio: { mimeType: `audio/pcm;rate=${INPUT_RATE}`, data: toBase64(event.data) } } }));
  };

  const ws = await open(first.grant);
  if (!ws) {
    handlers.onError('connection');
    end();
    return end;
  }
  handlers.onState('listening');
  run(ws, first.grant);
  return end;
}
