import { accept, complete } from "./quest.js";
export function validateTownStories(stories) {
  for (const story of Object.values(stories)) {
    for (const key of ["entry", "active", "after"])
      if (!story.nodes[story[key]]) throw Error("주민 대화 시작점 누락");
    for (const node of Object.values(story.nodes)) {
      for (const link of [
        node.next,
        node.missing,
        ...(node.choices || []).map((c) => c.next),
      ].filter(Boolean))
        if (!story.nodes[link]) throw Error("주민 대화 연결 누락");
      if (
        node.action &&
        !["accept", "complete", "cancel"].includes(node.action)
      )
        throw Error("잘못된 주민 대화 동작");
      if (node.action === "complete" && !node.missing)
        throw Error("물품 부족 대사 누락");
      for (const page of node.pages || [])
        if (typeof page.text !== "string") throw Error("잘못된 주민 대사");
    }
  }
  return true;
}
// Old NPC and quest IDs stay stable so existing saves retain progress and affinity.
export class TownStory {
  constructor(game, npc) {
    this.g = game;
    this.npc = npc;
    this.story = game.data.townStories[npc.id];
    this.quest = game.data.quests.find((q) => q.id === npc.quest);
    this.scene = game.state.scene;
  }
  start() {
    const status = this.g.state.quests[this.quest.id];
    this.go(
      this.story[
        status === "done" ? "after" : status === "active" ? "active" : "entry"
      ],
    );
  }
  go(id) {
    const { g, npc, quest } = this;
    if (g.state.scene !== this.scene) {
      g.ui.close();
      return;
    }
    const node = this.story.nodes[id];
    if (!node) throw Error("주민 대화 노드 누락: " + id);
    // Turn-in happens only after the player explicitly chooses to hand items over.
    if (node.action === "complete") {
      if (g.state.quests[quest.id] === "done") {
        this.go(this.story.after);
        return;
      }
      if (!complete(g.state, quest)) {
        this.go(node.missing);
        return;
      }
      g.state.affinity[npc.id] = (g.state.affinity[npc.id] || 0) + 1;
      g.ui.notify(`${quest.name} 완료 · +${quest.reward}G`);
    }
    if (!node.pages?.length) {
      this.finish(node);
      return;
    }
    g.ui.say(
      npc,
      node.pages,
      (node.choices || []).map((c) => [c.label, () => this.go(c.next)]),
      { role: npc.personality, onComplete: () => this.finish(node) },
    );
  }
  finish(node) {
    const { g, quest } = this;
    if (g.state.scene !== this.scene) {
      g.ui.close();
      return;
    }
    // Reading the offer to the end accepts it; ESC during the offer does not.
    if (node.action === "accept" && accept(g.state, quest))
      g.ui.notify("부탁 수락 · " + quest.name);
    if (node.action === "cancel" && g.state.quests[quest.id] === "active")
      delete g.state.quests[quest.id];
    if (node.next) this.go(node.next);
    else g.ui.close();
  }
}
