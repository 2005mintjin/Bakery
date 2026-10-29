// Optional visual regression check. Requires a running local game server and Playwright.
const { chromium } = await import(
  process.env.BAKERY_PLAYWRIGHT_MODULE || "playwright"
);
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const b = await chromium.launch({
  ...(process.env.BAKERY_BROWSER
    ? { executablePath: process.env.BAKERY_BROWSER }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://127.0.0.1:5173");
  const result = await p.evaluate(async () => {
    const [
      { Renderer },
      { loadScenery },
      { loadCounterArt },
      { fresh },
      { counterLayout },
    ] = await Promise.all([
      import("/src/renderer.js"),
      import("/src/scenery.js"),
      import("/src/counterArt.js"),
      import("/src/saveSystem.js"),
      import("/src/counterArt.js"),
    ]);
    const maps = await (await fetch("/data/interiorBackgrounds.json")).json();
    const [scenery, art] = await Promise.all([
      loadScenery(maps),
      loadCounterArt(await (await fetch("/data/npcs.json")).json()),
    ]);
    const canvas = document.createElement("canvas");
    for (const child of [...document.body.children])
      child.style.display = "none";
    document.body.append(canvas);
    const r = new Renderer(canvas, { buildings: [] }, scenery, maps, art),
      s = fresh();
    s.scene = "bakery";
    s.display = { loaf: 2, honeybread: 1, berrybread: 2 };
    const g = { state: s };
    r.draw(g, false, 0);
    const baseline = r.c.getImageData(0, 0, 1920, 1152).data,
      counts = [];
    for (const portrait of ["mira", "jun", "sora"]) {
      s.shop.customer = {
        name: portrait,
        portrait,
        phase: "waiting",
        bread: "loaf",
      };
      r.draw(g, false, 0);
      const pixels = r.c.getImageData(0, 0, 1920, 1152).data;
      let hiddenChanges = 0,
        visibleChanges = 0;
      for (let y = 0; y < 1152; y++)
        for (let x = 0; x < 1920; x++) {
          const i = (y * 1920 + x) * 4;
          const changed = [0, 1, 2, 3].some(
            (k) => pixels[i + k] !== baseline[i + k],
          );
          if (changed) {
            if (y >= counterLayout.frontY * 2) hiddenChanges++;
            if (x > 680 && x < 1200 && y > 460 && y < 750) visibleChanges++;
          }
        }
      counts.push({ portrait, hiddenChanges, visibleChanges });
    }
    s.shop.customer.portrait = "mira";
    s.shop.customer.name = "미라";
    r.draw(g, false, 0);
    return counts;
  });
  for (const row of result) {
    assert.equal(row.hiddenChanges, 0);
    assert.ok(row.visibleChanges > 1000);
  }
  await p.screenshot({
    path: path.join(tmpdir(), "customer-behind-checkout.png"),
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all 3 customers visible above the checkout; all pixels at/below the original counter surface match the unobstructed background, bread remains visible, no JS errors",
  );
} finally {
  await b.close();
}
