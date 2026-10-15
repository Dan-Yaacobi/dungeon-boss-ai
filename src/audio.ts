export class AudioEngine {
  ctx: AudioContext | null = null;
  music = 0.25;
  sfx = 0.5;
  timer = 0;
  theme = "town";
  step = 0;
  init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.timer = window.setInterval(() => this.beat(), 380);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }
  tone(
    f: number,
    d: number,
    volume: number,
    type: OscillatorType = "sine",
    delay = 0,
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(),
      g = this.ctx.createGain(),
      t = this.ctx.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + d + 0.01);
  }
  beat() {
    if (!this.ctx || !this.music) return;
    const notes =
      this.theme === "boss"
        ? [110, 130.81, 146.83, 103.83]
        : this.theme === "battle"
          ? [146.83, 174.61, 220, 196]
          : this.theme === "dungeon"
            ? [130.81, 155.56, 196, 174.61]
            : this.theme === "menu"
              ? [130.81, 164.81, 196, 146.83]
              : [164.81, 196, 246.94, 220];
    const root = notes[Math.floor(this.step / 8) % 4];
    if (this.step % 4 === 0) {
      this.tone(root, 1.8, this.music * 0.06, "triangle");
      this.tone(root * 1.5, 1.8, this.music * 0.025);
    }
    this.tone(
      root * [2, 3, 2.5, 4, 3, 2, 1.5, 3][this.step % 8],
      0.5,
      this.music * 0.035,
    );
    this.step++;
  }
  play(kind = "click") {
    this.init();
    if (kind === "victory") {
      [1, 1.25, 1.5, 2].forEach((x, i) =>
        this.tone(261.63 * x, 0.7, this.sfx * 0.12, "triangle", i * 0.13),
      );
    } else if (kind === "defeat") {
      [1, 0.8, 0.6].forEach((x, i) =>
        this.tone(220 * x, 0.6, this.sfx * 0.1, "triangle", i * 0.2),
      );
    } else if (kind === "spell") {
      [330, 660, 990].forEach((f, i) =>
        this.tone(f, 0.3, this.sfx * 0.08, "sine", i * 0.07),
      );
    } else if (kind === "hit") {
      this.tone(110, 0.15, this.sfx * 0.16, "sawtooth");
      this.tone(65, 0.25, this.sfx * 0.14, "triangle");
    } else this.tone(600, 0.09, this.sfx * 0.07, "triangle");
  }
}
