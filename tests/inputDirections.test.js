import test from "node:test";
import assert from "node:assert/strict";
import { HeldDirections, movementKeys } from "../src/inputDirections.js";
import { move } from "../src/player.js";
import { fresh } from "../src/saveSystem.js";
test("multi-touch retains a key until its last finger releases, and supports sliding directions", () => {
  const pad = new HeldDirections();
  assert.ok(pad.press(1, "w"));
  pad.press(2, "w");
  pad.release(1);
  assert.deepEqual([...pad.keys], ["w"]);
  pad.press(2, "d");
  assert.deepEqual([...pad.keys], ["d"]);
  pad.release(2);
  assert.equal(pad.keys.size, 0);
  assert.equal(pad.press(3, "bad"), false);
});
test("cancellation clears held fingers, preserves keyboard input and repeated releases are safe", () => {
  const pad = new HeldDirections(),
    keyboard = new Set(["a"]);
  pad.press(1, "w");
  pad.press(2, "d");
  assert.deepEqual([...movementKeys(keyboard, pad.keys)], ["a", "w", "d"]);
  pad.clear();
  pad.release(1);
  pad.release(2);
  assert.equal(pad.pointers.size, 0);
  assert.equal(pad.keys.size, 0);
  assert.deepEqual([...movementKeys(keyboard, pad.keys)], ["a"]);
});
test("touch and keyboard use identical normalized movement and collisions", () => {
  const pad = new HeldDirections();
  pad.press(1, "w");
  pad.press(2, "d");
  const s = fresh();
  s.x = 480;
  s.y = 310;
  const before = { x: s.x, y: s.y };
  move(s, movementKeys(new Set(), pad.keys), 0.1, []);
  assert.ok(
    Math.abs(Math.hypot(s.x - before.x, s.y - before.y) - 14.5) < 0.0001,
  );
  pad.clear();
  const stopped = { x: s.x, y: s.y };
  assert.equal(move(s, movementKeys(new Set(), pad.keys), 0.1, []), false);
  assert.deepEqual({ x: s.x, y: s.y }, stopped);
});
