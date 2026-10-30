import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  DialogueVoice,
  voicePlan,
  audibleWindow,
} from "../src/dialogueVoice.js";
import { characters, DialogueSequence } from "../src/dialogueSequence.js";
const config = JSON.parse(
  readFileSync(new URL("../data/voices.json", import.meta.url)),
);
function buffer(samples = [0, 0, 0.2, 0.5, 0.3, 0, 0], rate = 100) {
  const data = Float32Array.from(samples);
  return {
    numberOfChannels: 1,
    length: data.length,
    sampleRate: rate,
    getChannelData() {
      return data;
    },
  };
}
function setup() {
  const sources = [],
    gains = [],
    calls = [];
  const ctx = {
    state: "running",
    currentTime: 1,
    destination: {},
    async decodeAudioData() {
      return buffer();
    },
    createBufferSource() {
      const source = {
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
        start(...args) {
          this.started = args;
        },
        stop(time) {
          this.stopped = time ?? true;
        },
      };
      sources.push(source);
      return source;
    },
    createGain() {
      const ramps = [],
        gain = {
          ramps,
          connect() {},
          disconnect() {},
          gain: {
            setValueAtTime(...a) {
              ramps.push(a);
            },
            linearRampToValueAtTime(...a) {
              ramps.push(a);
            },
          },
        };
      gains.push(gain);
      return gain;
    },
  };
  const music = { muted: false, volume: 0.4 },
    errors = [];
  const voices = new DialogueVoice(config, music, {
    getContext: () => ctx,
    fetcher: async (asset) => {
      calls.push(asset);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) };
    },
    onError: (message) => errors.push(message),
  });
  return { ctx, voices, music, sources, gains, calls, errors };
}
test("all nine named MP3s are bundled with explicit character aliases and unknown people stay silent", () => {
  assert.equal(Object.keys(config.speakers).length, 9);
  for (const [key, record] of Object.entries(config.speakers)) {
    assert.ok(existsSync(new URL("../" + record.asset, import.meta.url)));
    for (const name of record.aliases)
      assert.deepEqual(voicePlan({ text: "가 나." }, { name }, config), [
        key,
        null,
        key,
        null,
      ]);
  }
  assert.deepEqual(
    voicePlan({ text: "안녕" }, { name: "미라", portrait: "sora" }, config),
    [null, null],
  );
});
test("punctuation-only pages, narrator pages and speaker labels make no voice", () => {
  for (const text of ["....", '... …!?\n ""', "！？。…"])
    assert.ok(
      voicePlan({ text }, { name: "데셰네" }, config).every((x) => x === null),
    );
  for (const page of [
    { text: "시선을 피한다.", kind: "narration" },
    { text: "고개를 돌렸다.", speaker: "이야기" },
    { text: "설명", speaker: "Narrator" },
  ])
    assert.ok(
      voicePlan(page, { name: "에리나" }, config).every((x) => x === null),
    );
  assert.deepEqual(
    voicePlan({ text: "아리엔: 가!" }, { name: "고양이 세 자매" }, config),
    [null, null, null, null, null, "arien", null],
  );
});
test("grouped sisters switch samples per line while ellipses and CRLF preserve grapheme indices", () => {
  for (const sep of ["\n", "\r\n", "\r"]) {
    const text = [
      "아리엔: 안녕!",
      "사샤: 네...",
      "에리나: ....",
      "이야기: 고개를 돌린다.",
    ].join(sep);
    const plan = voicePlan(
      { text, speaker: "고양이 세 자매" },
      { name: "고양이 세 자매" },
      config,
    );
    assert.equal(plan.length, characters(text).length);
    assert.deepEqual(plan.filter(Boolean), ["arien", "arien", "sasha"]);
  }
  assert.deepEqual(
    voicePlan(
      { text: "네", speaker: "에리나" },
      { name: "고양이 세 자매" },
      config,
    ),
    ["erina"],
  );
});
test("audible window ignores MP3 padding and silence without changing original PCM", () => {
  const b = buffer(),
    before = [...b.getChannelData(0)];
  assert.deepEqual(audibleWindow(b), { start: 0.02, end: 0.05 });
  assert.deepEqual([...b.getChannelData(0)], before);
  assert.equal(audibleWindow(buffer([0, 0, 0])), null);
});
test("sample loading caches decoded MP3s and unavailable audio does not break dialogue", async () => {
  const t = setup();
  await t.voices.unlock();
  await t.voices.unlock();
  assert.equal(t.calls.length, Object.keys(config.speakers).length);
  assert.equal(t.voices.buffers.size, Object.keys(config.speakers).length);
  assert.deepEqual(t.errors, []);
  const missing = new DialogueVoice(config, t.music, {
    getContext: () => null,
  });
  await missing.unlock();
  missing.type(missing.begin(), ["maria"]);
  const failed = new DialogueVoice(config, t.music, {
    getContext: () => t.ctx,
    fetcher: async () => {
      throw Error("missing");
    },
    onError: () => t.errors.push("missing"),
  });
  await failed.unlock();
  failed.type(failed.begin(), ["maria"]);
  assert.equal(t.errors.length, 1);
});
test("each newly revealed letter schedules one bounded non-overlapping faded voice at shared volume", async () => {
  const t = setup();
  await t.voices.unlock();
  const id = t.voices.begin();
  t.voices.type(id, ["maria", null, "maria"]);
  assert.equal(t.sources.length, 2);
  assert.equal(t.sources[0].started[1], 0.02);
  assert.ok(t.sources[0].started[2] <= 0.028);
  assert.ok(t.sources[1].started[0] >= t.sources[0].stopped);
  assert.equal(t.gains[0].ramps[0][0], 0);
  assert.equal(t.gains[0].ramps[1][0], 0.4 * config.gain);
  assert.equal(t.gains[0].ramps.at(-1)[0], 0);
  for (const source of t.sources) source.onended();
  assert.equal(t.voices.active.size, 0);
});
test("mute, zero volume, blocked context and cancellation stop current and queued voices", async () => {
  const t = setup();
  await t.voices.unlock();
  const id = t.voices.begin();
  t.voices.type(id, ["maria", "maria"]);
  t.music.muted = true;
  t.voices.type(id, ["maria"]);
  assert.equal(t.voices.active.size, 0);
  assert.ok(t.sources.every((s) => s.stopped === true));
  t.music.muted = false;
  t.music.volume = 0;
  t.voices.type(id, ["maria"]);
  assert.equal(t.sources.length, 2);
  t.music.volume = 0.4;
  t.ctx.state = "suspended";
  t.voices.type(id, ["maria"]);
  assert.equal(t.sources.length, 2);
  t.ctx.state = "running";
  t.voices.type(id, ["maria"]);
  t.voices.silence(id);
  assert.equal(t.voices.active.size, 0);
  const next = t.voices.begin();
  t.voices.type(next, ["erina"]);
  t.voices.end(id);
  assert.equal(t.voices.active.size, 1);
  t.voices.end(next);
  assert.equal(t.voices.active.size, 0);
  t.voices.type(next, ["erina"]);
  assert.equal(t.voices.active.size, 0);
});
test("instant reveal and page advance do not replay all the skipped characters", async () => {
  const t = setup();
  await t.voices.unlock();
  const id = t.voices.begin(),
    model = new DialogueSequence(["안녕하세요...", "...."]),
    plan = voicePlan(model.page, { name: "마리아" }, config);
  let before = model.count;
  model.tick(28);
  t.voices.type(id, plan.slice(before, model.count));
  assert.equal(t.sources.length, 1);
  t.voices.silence(id);
  model.advance();
  assert.equal(model.phase, "ready");
  assert.equal(t.sources.length, 1);
  model.advance();
  before = model.count;
  model.tick(100);
  t.voices.type(
    id,
    voicePlan(model.page, { name: "마리아" }, config).slice(
      before,
      model.count,
    ),
  );
  assert.equal(t.sources.length, 1);
});
test("default browser fetch keeps the global receiver when loading named samples", async () => {
  const t = setup(),
    original = globalThis.fetch;
  try {
    globalThis.fetch = function () {
      assert.equal(this, globalThis);
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(4),
      });
    };
    const voices = new DialogueVoice(config, t.music, {
      getContext: () => t.ctx,
    });
    await voices.unlock();
    assert.equal(voices.buffers.size, Object.keys(config.speakers).length);
  } finally {
    globalThis.fetch = original;
  }
});
test("only the three sisters get the configured twofold gain", async () => {
  const t = setup();
  await t.voices.unlock();
  const id = t.voices.begin();
  for (const key of Object.keys(config.speakers)) {
    t.voices.type(id, [key]);
    const gain = t.gains.at(-1).ramps[1][0];
    assert.equal(
      gain,
      t.music.volume *
        config.gain *
        (["arien", "sasha", "erina"].includes(key) ? 2 : 1),
    );
  }
});

test("new staff and bakery visitor names resolve to the supplied voices, with ellipses and narration silent", () => {
  const service = JSON.parse(
      readFileSync(new URL("../data/serviceDialogues.json", import.meta.url)),
    ),
    customers = JSON.parse(
      readFileSync(new URL("../data/customers.json", import.meta.url)),
    );
  for (const [staff, id, key] of [
    ["post", "post-clerk", "post-clerk"],
    ["mold", "soma", "soma"],
    ["furnace", "crematory", "crematory"],
  ]) {
    for (const actor of [
      service.staff[staff],
      customers.find((c) => c.portrait === id),
    ])
      assert.deepEqual(voicePlan({ text: "안녕!" }, actor, config), [
        key,
        key,
        null,
      ]);
    assert.ok(
      voicePlan({ text: "..." }, service.staff[staff], config).every(
        (k) => k === null,
      ),
    );
    assert.ok(
      voicePlan(
        { text: "고개를 돌린다.", kind: "narration" },
        service.staff[staff],
        config,
      ).every((k) => k === null),
    );
  }
  assert.ok(config.speakers["post-clerk"].asset.endsWith("/ryo.mp3"));
  assert.ok(
    voicePlan({ text: "안녕" }, { name: "하나" }, config).every(
      (k) => k === null,
    ),
  );
});
