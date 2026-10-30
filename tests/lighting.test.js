import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lampPower, drawSceneLighting } from "../src/render/lighting.js";
const lighting = JSON.parse(
  readFileSync(new URL("../data/lighting.json", import.meta.url)),
);
test("lamps turn on at 19:00, stay lit through midnight, fade before 06:00", () => {
  for (const t of [360, 720, 960, 1139]) assert.equal(lampPower(t), 0);
  for (const t of [1140, 1439, 0, 299, 1440]) assert.equal(lampPower(t), 1);
  assert.equal(lampPower(330), 0.5);
  assert.equal(lampPower(1800), 0);
});
test("daytime leaves room art unchanged; night darkens room/windows and adds warm lights", () => {
  const calls = [],
    c = {
      save() {},
      restore() {},
      fillRect(...args) {
        calls.push(["fill", this.fillStyle, ...args]);
      },
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      fill() {
        calls.push(["window", this.fillStyle]);
      },
      rect() {},
      clip(rule) {
        calls.push(["clip", rule]);
      },
      createRadialGradient() {
        return { addColorStop() {} };
      },
    };
  const r = { c, lighting };
  drawSceneLighting(r, "bakery", 360);
  assert.equal(calls.length, 0);
  drawSceneLighting(r, "bakery", 960);
  assert.ok(calls.some((v) => String(v[1]).includes("255,164,61")));
  calls.length = 0;
  drawSceneLighting(r, "bakery", 1140);
  assert.ok(calls.some((v) => v[0] === "window"));
  assert.ok(calls.some((v) => v[0] === "clip" && v[1] === "evenodd"));
  assert.equal(c.globalCompositeOperation, "screen");
  for (const scene of ["town", "city", "pond"])
    assert.ok(lighting[scene].lamps.length);
  for (const scene of [
    "bakery",
    "bakeryKitchen",
    "post",
    "store",
    "cafe",
    "workshop",
  ])
    assert.ok(lighting[scene].lamps.length);
});
