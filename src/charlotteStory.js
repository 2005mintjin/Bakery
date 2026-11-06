import { playPerformance } from "./performance.js";
export class CharlotteStory {
  constructor(g, npc) {
    this.g = g; this.npc = npc; this.story = g.data.charlotte;
    this.state = g.state; this.scene = g.state.scene; this.turn = 0;
  }
  valid() { return this.g.state === this.state && this.g.state.scene === this.scene; }
  start() { this.go(this.story.entry); }
  go(id) {
    if (!this.valid()) return;
    const g = this.g, node = this.story.nodes[id], turn = ++this.turn;
    if (!node.pages?.length) { g.ui.close(); return; }
    let finished = false;
    const finish = () => {
      if (finished || turn !== this.turn || !this.valid() || g.ui.open === false) return;
      finished = true;
      if (node.action === "perform") playPerformance(g, this.npc, this.story.performance, () => {
        if (this.valid() && turn === this.turn) this.go("feedback");
      });
      else if (node.next) this.go(node.next);
      else g.ui.close();
    };
    g.ui.say(this.npc, node.pages, (node.choices || []).map(c => [c.label, () => {
      if (turn === this.turn && this.valid()) this.go(c.next);
    }]), { role: this.npc.personality, onComplete: finish, immediateChoices: id === "menu" });
  }
}
