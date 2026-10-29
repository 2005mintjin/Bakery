import {
  beginDough,
  knead,
  addTopping,
  putInOven,
  tickBaking,
  collectBread,
} from "../src/baking.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fresh, save, load } from "../src/saveSystem.js";
import { display, sell, buyItem } from "../src/bakery.js";
import { accept, complete } from "../src/quest.js";
import { move } from "../src/player.js";
import {
  transition,
  configureWorld,
  worldMaps,
  nearbyDoor,
  enterBuilding,
  repairPosition,
} from "../src/sceneManager.js";
const maps = JSON.parse(
  readFileSync(new URL("../data/worldMaps.json", import.meta.url)),
);
configureWorld(maps);
const recipes = JSON.parse(
    readFileSync(new URL("../data/recipes.json", import.meta.url)),
  ),
  quests = JSON.parse(
    readFileSync(new URL("../data/quests.json", import.meta.url)),
  );
function makeBread(s, r) {
  if (!beginDough(s)) return false;
  for (let i = 0; i < 20; i++) knead(s, 60);
  if (
    !addTopping(
      s,
      { loaf: "none", honeybread: "honey", berrybread: "berry" }[r.id],
    )
  )
    return false;
  putInOven(s);
  tickBaking(s, 5);
  collectBread(s);
  return takeBread(s, r.id);
}
test("three recipes consume ingredients, display and settle exactly once", () => {
  const s = fresh();
  s.items.berry = 2;
  for (const r of recipes) {
    assert.ok(makeBread(s, r));
    assert.ok(display(s, r.id));
    assert.equal(s.items[r.id], 0);
  }
  assert.equal(sell(s, recipes), 71);
  assert.equal(sell(s, recipes), 0);
  s.items.flour = 0;
  assert.equal(makeBread(s, recipes[0]), false);
  assert.ok(buyItem(s, { id: "flour", price: 2, quantity: 1 }));
});
test("all three quests require acceptance and pay rewards only once", () => {
  const s = fresh();
  for (const q of quests) {
    assert.equal(complete(s, q), false);
    assert.ok(accept(s, q));
    if (q.item) {
      assert.equal(complete(s, q), false);
      s.items[q.item] = q.count;
    }
    assert.ok(complete(s, q));
    assert.equal(complete(s, q), false);
    assert.equal(accept(s, q), false);
  }
  assert.equal(s.money, 140);
});
test("save roundtrip retains quest, position and economy; rejects invalid saves", () => {
  let value;
  const storage = { setItem: (k, v) => (value = v), getItem: () => value };
  const s = fresh();
  s.scene = "bakery";
  s.quests.delivery = "done";
  save(s, storage);
  assert.deepEqual(load(storage), s);
  value = "{}";
  assert.throws(() => load(storage));
});
test("wall collision, normalized diagonal movement and door roundtrip", () => {
  const s = fresh();
  s.x = 200;
  s.y = 215;
  move(s, new Set(["w"]), 0.1, []);
  assert.equal(s.y, 215);
  s.x = 480;
  s.y = 450;
  move(s, new Set(["d", "s"]), 0.1, []);
  assert.ok(Math.abs(Math.hypot(s.x - 480, s.y - 450) - 14.5) < 0.001);
  s.x = 277;
  s.y = 232;
  assert.ok(transition(s));
  assert.equal(s.scene, "bakery");
  assert.ok(leaveInterior(s));
  assert.equal(s.scene, "town");
});
import {
  storeBread,
  takeBread,
  tickShop,
  serve,
  receiveParcel,
} from "../src/shop.js";
import { validate } from "../src/saveSystem.js";
test("warehouse transfer and timed orders consume only the requested displayed bread", () => {
  const s = fresh();
  makeBread(s, recipes[0]);
  assert.ok(storeBread(s, "loaf"));
  assert.equal(display(s, "loaf"), false);
  assert.ok(takeBread(s, "loaf"));
  assert.ok(display(s, "loaf"));
  assert.equal(tickShop(s, 30), false);
  s.shop.open = true;
  assert.equal(tickShop(s, 11), false);
  assert.ok(tickShop(s, 1));
  assert.equal(s.shop.customer.bread, "loaf");
  assert.equal(serve(s, recipes), false);
  tickShop(s, 1.2);
  assert.ok(serve(s, recipes));
  assert.equal(s.money, 76);
  assert.equal(serve(s, recipes), false);
  tickShop(s, 12);
  assert.equal(serve(s, recipes), false);
  assert.equal(s.shop.customer.bread, "honeybread");
});
test("post office parcel cannot be received twice on the same day", () => {
  const s = fresh();
  assert.ok(receiveParcel(s));
  assert.equal(receiveParcel(s), false);
  assert.equal(s.items.flour, 16);
  s.day++;
  assert.ok(receiveParcel(s));
  assert.equal(s.parcels.length, 2);
});
test("post office and eastern city exits return to the village", () => {
  const s = fresh();
  s.x = 719;
  s.y = 233;
  assert.ok(transition(s));
  assert.equal(s.scene, "post");
  leaveInterior(s);
  assert.equal(s.scene, "town");
  s.x = 925;
  s.y = 330;
  transition(s);
  assert.equal(s.scene, "city");
  s.x = 35;
  transition(s);
  assert.equal(s.scene, "town");
});
test("v1 migration and malformed shop rejection", () => {
  const s = fresh();
  s.version = 1;
  delete s.shop;
  delete s.warehouse;
  assert.equal(validate(s).version, 4);
  assert.deepEqual(validate(s).warehouse, {
    loaf: 0,
    honeybread: 0,
    berrybread: 0,
  });
  const bad = fresh();
  bad.shop.customer = { name: "bad", bread: "invalid" };
  assert.throws(() => validate(bad));
});
import {
  isInterior,
  leaveInterior,
  interiorActions,
  changeBakeryRoom,
} from "../src/interior.js";
import { spriteFrame } from "../src/playerSprite.js";
const atlas = JSON.parse(
  readFileSync(new URL("../data/playerAtlas.json", import.meta.url)),
);
test("first-person interior actions and exits preserve gameplay state", () => {
  const s = fresh();
  s.scene = "bakery";
  assert.ok(isInterior(s.scene));
  assert.equal(interiorActions.bakery.length, 2);
  assert.ok(leaveInterior(s));
  assert.equal(s.scene, "town");
  assert.equal(s.x, 277);
  s.scene = "post";
  assert.ok(leaveInterior(s));
  assert.equal(s.x, 719);
  assert.equal(leaveInterior(s), false);
  assert.equal(isInterior("city"), false);
});
test("standing directions use row one; walking uses row two and never jumps or bread poses", () => {
  const down = spriteFrame(atlas, 1536, 1024, false, 0, "down"),
    up = spriteFrame(atlas, 1536, 1024, false, 0, "up");
  assert.equal(down.y, 0);
  assert.notEqual(down.x, up.x);
  for (const d of ["up", "down", "left", "right"])
    for (const t of [0, 0.1, 0.8, 2]) {
      const f = spriteFrame(atlas, 1536, 1024, true, t, d);
      assert.equal(f.y, 228);
      assert.equal(f.h, 192);
      assert.ok(f.x >= 0 && f.x + f.w <= 1536.001);
      assert.equal(f.flip, d === "left");
    }
  assert.equal(atlas.reservedBread.y, 612);
  assert.equal(atlas.reservedBread.enabled, false);
});
import { animationFrame, spriteDrawRect } from "../src/playerSprite.js";
const animations = JSON.parse(
  readFileSync(new URL("../data/playerAnimations.json", import.meta.url)),
);
test("bundled original assets have four idle directions and short directional gait cycles", () => {
  let count = 0;
  for (const direction of ["up", "down", "left", "right"]) {
    const idle = animationFrame(animations, false, 0, direction);
    assert.equal(idle.asset, "assets/characters/player-idle.png");
    assert.equal(idle.anchorY, 224);
    const frames = animations.walk.frames[direction];
    assert.equal(frames.length, 4);
    count += frames.length;
    for (let i = 0; i < frames.length; i++) {
      const f = animationFrame(animations, true, (i + 0.1) / 10, direction);
      assert.equal(f.index, i);
      assert.equal(f.asset, "assets/characters/player-walk.png");
      assert.ok(f.x + f.w <= 896);
      assert.ok(f.y + f.h <= 928);
      assert.equal(f.anchorX, 112);
    }
    assert.equal(
      animationFrame(animations, true, frames.length / 10, direction).index,
      0,
    );
  }
  assert.equal(count, 16);
  assert.equal(animations.reservedBread.enabled, false);
  for (const group of ["idle", "walk", "reservedBread"]) {
    const png = readFileSync(
      new URL("../" + animations[group].asset, import.meta.url),
    );
    assert.equal(png.subarray(1, 4).toString(), "PNG");
  }
});

test("walking loops through stride-pass-stride-pass with consistent body and cap size", () => {
  for (const direction of ["up", "down", "left", "right"]) {
    const frames = animations.walk.frames[direction],
      idle = animations.idle.frames[direction][0];
    const sources = frames.map((f) => f.sourceIndex);
    assert.equal(new Set(sources).size, 3);
    assert.equal(sources[1], sources[3]);
    assert.notEqual(sources[0], sources[2]);
    assert.ok(frames.length / animations.walk.fps <= 0.4);
    for (const f of frames) {
      assert.ok(Math.abs(f.bodyHeight * f.scaleY - idle.bodyHeight) < 0.001);
      assert.ok(Math.abs(f.headWidth * f.scaleX - idle.headWidth) < 0.001);
      const r = spriteDrawRect({ ...f, scale: 1 }, 400, 400);
      assert.ok(
        Number.isFinite(r.x) && Number.isFinite(r.y) && r.w > 0 && r.h > 0,
      );
    }
  }
  assert.equal(animations.walk.paletteMatched, true);
  assert.equal(animations.walk.scale, animations.idle.scale);
});
test("walking vertically through repeated animation loops never shifts world X", () => {
  const s = fresh();
  s.x = 600;
  s.y = 520;
  for (let i = 0; i < 80; i++) {
    move(s, new Set(["w"]), 0.016, []);
    assert.equal(s.x, 600);
  }
  for (let i = 0; i < 80; i++) {
    move(s, new Set(["s"]), 0.016, []);
    assert.equal(s.x, 600);
  }
});

test("bakery production has its own room and only store sells ingredients", () => {
  const s = fresh();
  s.scene = "bakery";
  const money = s.money;
  s.items.loaf = 2;
  assert.ok(changeBakeryRoom(s));
  assert.equal(s.scene, "bakeryKitchen");
  assert.deepEqual(
    interiorActions.bakeryKitchen.map((x) => x[0]),
    ["oven", "warehouse"],
  );
  assert.ok(
    !interiorActions.bakery.some((x) =>
      ["oven", "warehouse", "supplies"].includes(x[0]),
    ),
  );
  assert.ok(changeBakeryRoom(s));
  assert.equal(s.scene, "bakery");
  assert.equal(s.items.loaf, 2);
  assert.equal(s.money, money);
  assert.equal(changeBakeryRoom(fresh()), false);
  assert.deepEqual(
    interiorActions.store.map((x) => x[0]),
    ["storeTalk"],
  );
});
test("city store door and exit, kitchen save, and relocation of old obstructed saves", () => {
  const s = fresh();
  s.scene = "city";
  s.x = 728;
  s.y = 245;
  const door = nearbyDoor(s);
  assert.equal(door.scene, "store");
  assert.ok(enterBuilding(s, door));
  assert.equal(s.scene, "store");
  assert.equal(validate(s).scene, "store");
  assert.ok(leaveInterior(s));
  assert.equal(s.scene, "city");
  assert.equal(s.x, 728);
  assert.ok(!enterBuilding(s, { scene: "store" }));
  s.scene = "bakeryKitchen";
  assert.equal(validate(s).scene, "bakeryKitchen");
  s.scene = "town";
  s.x = 200;
  s.y = 100;
  s.money = 123;
  repairPosition(s);
  assert.deepEqual([s.x, s.y], [480, 310]);
  assert.equal(s.money, 123);
});
test("left standing and walking use the exact right frames with reflection", () => {
  for (const walking of [false, true])
    for (const t of [0, 0.1, 0.2, 0.3, 0.4, 1]) {
      const right = animationFrame(animations, walking, t, "right"),
        left = animationFrame(animations, walking, t, "left");
      assert.equal(left.flip, true);
      delete left.flip;
      assert.deepEqual(left, right);
    }
});
