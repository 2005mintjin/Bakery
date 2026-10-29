import test from "node:test";
import assert from "node:assert/strict";
import { drawCounter, counterLayout } from "../src/counterArt.js";
test("customer is behind the checkout foreground with bread visible in the case", () => {
  const calls = [],
    portrait = { width: 128, height: 160 },
    background = {},
    bread = {};
  const r = {
    bg: { bakery: background },
    counterArt: new Map([
      ["mira", portrait],
      ["loaf", bread],
    ]),
    c: {
      drawImage: (image, ...args) => calls.push({ image, args }),
      save() {},
      restore() {},
      beginPath() {},
      rect: (...args) => calls.push({ clip: args }),
      clip() {},
    },
    r() {},
    text() {},
  };
  drawCounter(r, {
    shop: {
      customer: {
        phase: "waiting",
        portrait: "mira",
        name: "미라",
        bread: "loaf",
      },
    },
    display: { loaf: 1 },
  });
  const layers = calls.filter((c) => c.image);
  assert.deepEqual(
    layers.map((c) => c.image),
    [bread, portrait, background],
  );
  assert.deepEqual(calls.find((c) => c.clip).clip, [0, 459, 960, 117]);
  const portraitBottom =
    counterLayout.customer.y +
    (counterLayout.customer.width * portrait.height * 0.62) / portrait.width;
  assert.ok(portraitBottom > counterLayout.frontY);
  assert.ok(
    counterLayout.order.y + counterLayout.order.height <
      counterLayout.customer.y + 30,
  );
  calls.length = 0;
  drawCounter(r, { shop: { customer: { phase: "knocking" } }, display: {} });
  assert.equal(calls.length, 0);
});
test("custom visitors draw SD bounds at the counter while keeping the foreground mask", () => {
  const sd = { sdBounds: [10, 20, 200, 300] },
    background = {},
    calls = [];
  const r = {
    counterArt: new Map([["sora", sd]]),
    bg: { bakery: background },
    c: {
      drawImage: (...a) => calls.push(a),
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      clip() {},
    },
    r() {},
    text() {},
  };
  drawCounter(r, {
    display: {},
    shop: {
      customer: {
        phase: "waiting",
        portrait: "sora",
        name: "마리아",
        bread: "loaf",
      },
    },
  });
  assert.deepEqual(calls[0].slice(1, 5), sd.sdBounds);
  assert.equal(calls[0].at(-1), counterLayout.sdCustomer.height);
  assert.equal(calls[1][0], background);
});
