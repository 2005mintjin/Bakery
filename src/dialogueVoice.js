import { characters } from "./dialogueSequence.js";
const narrationNames = /^(이야기|나레이터|내레이터|지문|narrator|narration)$/i;
function voiceKey(config, name) {
  return Object.entries(config.speakers).find(
    ([key, speaker]) => key === name || speaker.aliases.includes(name),
  )?.[0];
}
// One entry per visible grapheme. Labels, punctuation and narration stay silent.
export function voicePlan(page, actor, config) {
  const letters = characters(page.text);
  if (
    page.kind === "narration" ||
    narrationNames.test(page.speaker || actor.name || "")
  )
    return letters.map(() => null);
  const defaultName =
    page.voice ||
    page.speaker ||
    actor.voice ||
    actor.name ||
    actor.id ||
    actor.portrait;
  const plan = [];
  for (const line of page.text.split(/\r\n|\n|\r/)) {
    const label = line.match(/^([^:：]{1,40})[:：]\s*/u);
    const key = voiceKey(config, label ? label[1].trim() : defaultName);
    const prefixLength = label ? characters(label[0]).length : 0;
    for (const [index, letter] of characters(line).entries())
      plan.push(
        index >= prefixLength && /[\p{L}\p{N}]/u.test(letter)
          ? key || null
          : null,
      );
    plan.push(null); // newline, removed after the last line
  }
  plan.pop();
  return plan;
}
// Ignore MP3 padding/leading silence without modifying the supplied files.
export function audibleWindow(buffer) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  let peak = 0;
  for (const channel of channels)
    for (const sample of channel) peak = Math.max(peak, Math.abs(sample));
  if (peak < 0.001) return null;
  const threshold = Math.max(0.001, peak * 0.02);
  const voiced = (i) =>
    channels.some((channel) => Math.abs(channel[i]) >= threshold);
  let first = 0,
    last = buffer.length - 1;
  while (first < last && !voiced(first)) first++;
  while (last > first && !voiced(last)) last--;
  return {
    start: first / buffer.sampleRate,
    end: (last + 1) / buffer.sampleRate,
  };
}
export class DialogueVoice {
  constructor(
    config,
    music,
    {
      getContext,
      fetcher = (...args) => globalThis.fetch(...args),
      onError = () => {},
    } = {},
  ) {
    this.config = config;
    this.music = music;
    this.getContext = getContext;
    this.fetcher = fetcher;
    this.onError = onError;
    this.buffers = new Map();
    this.active = new Set();
    this.session = 0;
    this.nextTime = 0;
    this.loading = null;
  }
  unlock() {
    const ctx = this.getContext?.();
    if (!ctx) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = Promise.all(
      Object.entries(this.config.speakers).map(async ([key, speaker]) => {
        try {
          const response = await this.fetcher(speaker.asset);
          if (!response.ok) throw Error("Voice file");
          const buffer = await ctx.decodeAudioData(
            await response.arrayBuffer(),
          );
          const window = audibleWindow(buffer);
          if (window) this.buffers.set(key, { buffer, ...window });
        } catch {
          return false;
        }
        return true;
      }),
    ).then((results) => {
      if (results.some((result) => !result))
        this.onError(
          "일부 목소리 파일을 읽지 못했어요. 대화는 계속할 수 있습니다.",
        );
    });
    return this.loading;
  }
  begin() {
    this.silence();
    return ++this.session;
  }
  silence(session) {
    if (session !== undefined && session !== this.session) return;
    for (const { source, gain } of this.active) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
      gain.disconnect();
    }
    this.active.clear();
    this.nextTime = 0;
  }
  end(session) {
    if (session !== this.session) return;
    this.silence(session);
    this.session++;
  }
  type(session, keys, interval = 0.028) {
    if (session !== this.session) return;
    const ctx = this.getContext?.();
    if (
      !ctx ||
      ctx.state !== "running" ||
      globalThis.document?.hidden ||
      this.music.muted ||
      this.music.volume <= 0
    ) {
      this.silence(session);
      return;
    }
    if (!keys.some((key) => this.buffers.has(key))) return;
    // Keep a stalled frame from accumulating a long burst of delayed syllables.
    if (this.nextTime > ctx.currentTime + 0.12) this.silence(session);
    this.nextTime = Math.max(ctx.currentTime, this.nextTime);
    for (const key of keys) {
      const entry = this.buffers.get(key);
      if (entry) {
        const duration = Math.min(
          this.config.sliceSeconds,
          interval,
          entry.end - entry.start,
        );
        const fade = Math.min(this.config.fadeSeconds, duration / 3);
        const source = ctx.createBufferSource(),
          gain = ctx.createGain(),
          time = this.nextTime;
        const volume =
          this.music.volume *
          this.config.gain *
          (this.config.speakers[key]?.gain ?? 1);
        source.buffer = entry.buffer;
        source.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(volume, time + fade);
        gain.gain.setValueAtTime(volume, time + duration - fade);
        gain.gain.linearRampToValueAtTime(0, time + duration);
        const node = { source, gain };
        this.active.add(node);
        source.onended = () => {
          this.active.delete(node);
          source.disconnect();
          gain.disconnect();
        };
        source.start(time, entry.start, duration);
        source.stop(time + duration);
      }
      this.nextTime += interval;
    }
  }
}
