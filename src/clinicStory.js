import { facilityOpen, closedMessage } from "./schedule.js";
import { clinicState, canClinicAction, clinicAction } from "./clinicQuests.js";

const messages = {
  acceptBread: "부탁 수락 · 환자들을 위한 밀빵 3개",
  deliverBread: "부탁 완료 · 환자들을 위한 밀빵",
  acceptGift: "부탁 수락 · 캐서린에게 베리 빵 1개를 맡기세요.",
  wrapGift: "선물을 포장했어요. 번화가의 미하일에게 전하세요.",
  deliverGift: "선물을 전했어요. 캐서린에게 돌아가 답을 전하세요.",
  reportThanks: "부탁 완료 · 간호사의 리본 선물",
  reportAnnoyed: "부탁 완료 · 간호사의 리본 선물",
};
export class ClinicStory {
  constructor(g, key, actor) {
    this.g = g;
    this.key = key;
    this.actor = actor || g.data.clinic.actors[key];
    this.story = g.data.clinic.stories[key];
    this.state = g.state;
    this.scene = g.state.scene;
    this.turn = 0;
  }
  valid() {
    return this.g.state === this.state && this.g.state.scene === this.scene &&
      (this.key === "mikhail" ? this.scene === "downtown" : this.scene === "clinic" && facilityOpen(this.state, "clinic"));
  }
  start() {
    const c = clinicState(this.state);
    let entry = "intro";
    if (this.key === "konstanze") entry = c.bread === "done" ? "after" : c.bread === "active" ? "active" : "intro";
    if (this.key === "catherine") entry = c.gift === "done" ? "after" : c.gift === "none" ? "intro" : c.gift;
    this.go(entry);
  }
  go(id) {
    if (!this.valid()) return;
    const g = this.g, s = g.state, node = this.story.nodes[id], turn = ++this.turn;
    if (!node) return;
    if (node.action && !canClinicAction(s, node.action)) {
      const missing = node.action === "deliverBread" ? "가방에 밀빵 3개가 필요해요." : node.action === "wrapGift" ? "가방에 베리 빵 1개가 필요해요." : "이미 진행했거나 지금은 진행할 수 없는 부탁이에요.";
      g.ui.notify(missing);
      this.start();
      return;
    }
    const actions = (node.choices || []).filter(c => c.condition !== "wrapped" || clinicState(s).gift === "wrapped")
      .map(c => [c.label, () => {
        if (turn === this.turn && this.valid() && g.ui.open !== false) this.go(c.next);
      }]);
    if (!node.pages?.length && !actions.length) { g.ui.close(); return; }
    let finished = false;
    const finish = () => {
      if (finished || turn !== this.turn || !this.valid() || g.ui.open === false) return;
      finished = true;
      if (node.action) {
        if (!clinicAction(s, node.action, g.data.clinic.breadReward)) {
          g.ui.notify("부탁 진행이나 가방이 바뀌었어요. 다시 확인해 주세요.");
          g.ui.close();
          return;
        }
        g.ui.notify(messages[node.action] + (node.action === "deliverBread" ? ` · +${g.data.clinic.breadReward}G` : ""));
      }
      if (node.next) this.go(node.next);
      else g.ui.close();
    };
    g.ui.say(this.actor, node.pages?.length ? node.pages : [{ text: "무슨 이야기를 할까요?", kind: "narration" }], actions,
      { role: this.actor.role, immediateChoices: !node.pages?.length || node.immediate, onComplete: finish });
  }
}
export function openClinicDialogue(g, key) {
  if (g.state.scene !== "clinic") return;
  if (!facilityOpen(g.state, "clinic")) { g.ui.notify(closedMessage(g.state, "clinic")); return; }
  const story = new ClinicStory(g, key);
  story.start();
  return story;
}
export function validateClinicStories(data) {
  if (!Number.isSafeInteger(data.breadReward) || data.breadReward < 0) throw Error("잘못된 의원 보상");
  for (const [key, story] of Object.entries(data.stories)) {
    if (!data.actors[key]?.portraitAsset || !story.nodes.intro) throw Error("의원 인물/시작점 누락");
    for (const node of Object.values(story.nodes)) {
      if (node.action && !Object.hasOwn(messages, node.action)) throw Error("의원 동작 누락");
      for (const link of [node.next, ...(node.choices || []).map(c => c.next)].filter(Boolean))
        if (!story.nodes[link]) throw Error("의원 대화 연결 누락");
      for (const page of node.pages || []) if (typeof page.text !== "string") throw Error("잘못된 의원 대사");
    }
  }
  return true;
}
