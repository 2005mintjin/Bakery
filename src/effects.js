export class Effects {
  constructor(music) {
    this.music = music;
    this.context = null;
  }
  unlock() {
    const AudioContext =
      globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContext) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        this.context.resume().catch(() => {});
    } catch {}
  }
  knock() {
    const ctx = this.context;
    if (
      !ctx ||
      ctx.state !== "running" ||
      this.music.muted ||
      this.music.volume <= 0
    )
      return;
    for (const delay of [0, 0.18, 0.39]) {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain(),
        t = ctx.currentTime + delay;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(175, t);
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.09);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.music.volume * 0.4, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(t);
      osc.stop(t + 0.14);
    }
  }
}
