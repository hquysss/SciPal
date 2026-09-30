// A spoken session with the Gemini Live API, straight from the browser. The backend hands out a
// one-use token already locked to the model and the tutor's instruction (routes/tutor.ts,
// POST /api/tutor/voice); this file only moves audio: the microphone goes up as 16 kHz 16-bit PCM,
// the tutor's voice comes back as 24 kHz PCM and is played in order. When the student talks over
// the tutor, the server says "interrupted" and whatever is still queued is dropped.

export type VoiceState = 'connecting' | 'listening' | 'speaking' | 'ended';
export type TranscriptLine = { who: 'student' | 'tutor'; text: string };
export type VoiceGrant = { token: string; model: string; socketUrl: string; maxSeconds: number };

export type VoiceHandlers = {
  onState: (state: VoiceState) => void;
  /** The newest words of the current turn, appended as they arrive. */
  onTranscript: (who: TranscriptLine['who'], text: string) => void;
  onTurnEnd: () => void;
  onError: (reason: 'microphone' | 'connection') => void;
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
  goAway?: unknown;
};

/** Opens the session; returns the function that ends it (idempotent). */
export async function startLiveSession(grant: VoiceGrant, handlers: VoiceHandlers): Promise<() => void> {
  let ended = false;
  let stream: MediaStream | null = null;
  let input: AudioContext | null = null;
  let output: AudioContext | null = null;
  let socket: WebSocket | null = null;
  let playhead = 0;
  const playing = new Set<AudioBufferSourceNode>();

  const stopPlayback = () => {
    for (const source of playing) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    playing.clear();
    playhead = 0;
  };

  const end = () => {
    if (ended) return;
    ended = true;
    stopPlayback();
    stream?.getTracks().forEach((track) => track.stop());
    void input?.close().catch(() => {});
    void output?.close().catch(() => {});
    if (socket && socket.readyState <= WebSocket.OPEN) socket.close();
    handlers.onState('ended');
  };

  handlers.onState('connecting');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  } catch {
    handlers.onError('microphone');
    end();
    return end;
  }

  input = new AudioContext();
  output = new AudioContext({ sampleRate: OUTPUT_RATE });
  const moduleUrl = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: 'text/javascript' }));
  try {
    await input.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
  const capture = new AudioWorkletNode(input, 'scipal-capture');
  input.createMediaStreamSource(stream).connect(capture);

  socket = new WebSocket(`${grant.socketUrl}?access_token=${encodeURIComponent(grant.token)}`);
  let ready = false;

  capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    if (!ready || socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ realtimeInput: { audio: { mimeType: `audio/pcm;rate=${INPUT_RATE}`, data: toBase64(event.data) } } }));
  };

  const play = (base64: string) => {
    if (!output) return;
    const samples = pcmToFloats(base64);
    const buffer = output.createBuffer(1, samples.length, OUTPUT_RATE);
    buffer.copyToChannel(samples, 0);
    const source = output.createBufferSource();
    source.buffer = buffer;
    source.connect(output.destination);
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

  socket.onopen = () => {
    // The token already fixes the model's configuration; the setup only names the model.
    socket?.send(JSON.stringify({ setup: { model: `models/${grant.model}` } }));
  };
  socket.onmessage = async (event) => {
    const text = typeof event.data === 'string' ? event.data : await (event.data as Blob).text();
    let message: ServerMessage;
    try {
      message = JSON.parse(text) as ServerMessage;
    } catch {
      return;
    }
    if (message.setupComplete) {
      ready = true;
      handlers.onState('listening');
    }
    const content = message.serverContent;
    if (content) {
      if (content.interrupted) stopPlayback();
      for (const part of content.modelTurn?.parts ?? []) {
        if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/')) play(part.inlineData.data);
      }
      if (content.inputTranscription?.text) handlers.onTranscript('student', content.inputTranscription.text);
      if (content.outputTranscription?.text) handlers.onTranscript('tutor', content.outputTranscription.text);
      if (content.turnComplete) handlers.onTurnEnd();
    }
    if (message.goAway) end();
  };
  socket.onerror = () => {
    if (!ended) handlers.onError('connection');
  };
  socket.onclose = () => end();

  // The token only buys this long; end cleanly before the server cuts the line.
  const timer = window.setTimeout(end, grant.maxSeconds * 1000);
  return () => {
    window.clearTimeout(timer);
    end();
  };
}
