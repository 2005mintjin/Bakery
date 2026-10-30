import { accept } from "./quest.js";
import { workDay } from "./dailyReport.js";
import { names } from "./inventory.js";
import {
  ensureAnastasia,
  anastasiaStatus,
  chooseDailyBread,
  acceptDailyBread,
  cancelDailyBread,
  completeFirstBread,
  completeDailyBread,
} from "./anastasiaQuests.js";
// Dialogue pages and choices stay in townStories.json; only quest transitions live here.
export class AnastasiaStory {
  constructor(game, npc) {
    this.g = game;
    this.npc = npc;
    this.story = game.data.townStories[npc.id];
    this.quest = game.data.quests.find((q) => q.id === npc.quest);
    this.scene = game.state.scene;
    this.day = workDay(game.state);
    this.turn = 0;
  }
  start() {
    const s = this.g.state,
      a = ensureAnastasia(s);
    if (s.quests[this.quest.id] !== "done") {
      this.go(
        this.story[s.quests[this.quest.id] === "active" ? "active" : "entry"],
      );
      return;
    }
    if (a.introDay >= workDay(s)) {
      this.go(this.story.after);
      return;
    }
    const status = anastasiaStatus(s);
    this.go(
      this.story.daily[
        status === "active" ? "active" : status === "done" ? "after" : "offer"
      ],
    );
  }
  valid() {
    return (
      this.g.state.scene === this.scene && workDay(this.g.state) === this.day
    );
  }
  go(id) {
    const { g, npc } = this,
      s = g.state;
    if (!this.valid()) {
      g.ui.close();
      return;
    }
    const node = this.story.nodes[id];
    if (!node) throw Error("아나스타샤 대화 연결 누락: " + id);
    const turn = ++this.turn;
    if (node.scope === "daily" && node.action === "accept")
      this.pendingProduct ??= chooseDailyBread(s);
    const product =
      node.scope === "daily" && node.action === "accept"
        ? this.pendingProduct
        : s.anastasia.daily?.product || this.quest.item;
    if (node.action === "complete") {
      const active =
        node.scope === "daily" ? anastasiaStatus(s) : s.quests[this.quest.id];
      if (active !== "active") {
        this.start();
        return;
      }
      if (!(s.items[product] >= 1)) {
        this.go(node.missing);
        return;
      }
    }
    const pages = (node.pages || []).map((p) => ({
      ...p,
      text: p.text.replaceAll("{bread}", names[product] || "빵"),
    }));
    let finished = false;
    const finish = () => {
      if (finished || turn !== this.turn || !this.valid()) return;
      finished = true;
      this.finish(node, product);
    };
    if (!pages.length) {
      finish();
      return;
    }
    g.ui.say(
      npc,
      pages,
      (node.choices || []).map((c) => [
        c.label,
        () => {
          if (turn === this.turn && this.valid()) this.go(c.next);
        },
      ]),
      { role: npc.personality, onComplete: finish },
    );
  }
  finish(node, product) {
    const { g, quest } = this,
      s = g.state;
    if (node.action === "accept") {
      const accepted =
        node.scope === "daily"
          ? acceptDailyBread(s, product)
          : accept(s, quest);
      if (accepted)
        g.ui.notify(
          "부탁 수락 · " +
            (node.scope === "daily" ? `${names[product]} 1개` : quest.name),
        );
    } else if (node.action === "complete") {
      const completed =
        node.scope === "daily"
          ? completeDailyBread(s, g.data.recipes)
          : completeFirstBread(s, quest);
      if (!completed) {
        this.go(node.missing);
        return;
      }
      const reward =
        node.scope === "daily"
          ? g.data.recipes.find((r) => r.id === product).price
          : quest.reward;
      g.ui.notify(`부탁 완료 · +${reward}G`);
    } else if (node.action === "cancel") {
      if (node.scope === "daily") cancelDailyBread(s);
      else if (s.quests[quest.id] === "active") delete s.quests[quest.id];
    }
    if (node.next) this.go(node.next);
    else g.ui.close();
  }
}
