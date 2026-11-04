import { names } from "./inventory.js";
import { syncGuild, guildSupplies, guildRules } from "./guild.js";
export function civicState(s) {
  return (s.civic ??= { lotusTaste: false, martinGift: "none" });
}
export function civicAction(s, action) {
  const c = civicState(s);
  if (action === "taste") c.lotusTaste = true;
  if (action === "berryGift") {
    if (!c.lotusTaste || !(s.items.berrybread >= 1)) return false;
    s.items.berrybread--;
  }
  if (action === "acceptGift") {
    if (c.martinGift !== "none") return false;
    c.martinGift = "carrying";
    s.quests.martinGift = "active";
  }
  if (action === "deliverGift") {
    if (c.martinGift !== "carrying") return false;
    c.martinGift = "delivered";
  }
  if (action === "reportGift") {
    if (c.martinGift !== "delivered") return false;
    c.martinGift = "done";
    s.quests.martinGift = "done";
  }
  return true;
}
export class CivicStory {
  constructor(g, key, actor) {
    this.g = g;
    this.key = key;
    this.actor = actor || g.data.civicActors[key];
    this.story = g.data.civicStories[key];
    this.state = g.state;
    this.scene = g.state.scene;
    this.turn = 0;
  }
  start() {
    const status = civicState(this.g.state).martinGift;
    this.go(this.key === "martin" && status !== "none" ? status : "entry");
  }
  valid() {
    return this.g.state === this.state && this.g.state.scene === this.scene;
  }
  go(id) {
    if (!this.valid()) return;
    const { g } = this, s = g.state, c = civicState(s);
    const node = this.story.nodes[id], turn = ++this.turn;
    if (node.action === "berryGift" && (!c.lotusTaste || !(s.items.berrybread >= 1))) {
      g.ui.notify("가방에 베리 빵 1개가 필요해요.");
      this.go("menu");
      return;
    }
    if (this.key === "mariaGift" && c.martinGift !== "carrying") {
      g.ui.close();
      return;
    }
    const guild = syncGuild(s);
    const nextEvaluation = Math.max(guild.evaluated + 7, 1 + Math.ceil((guild.joinedDay + 6) / 7) * 7);
    const thresholds = guildRules.slice(1).map((r) => `${r.grade}: 하루 평균 ${r.average}개`).join(" / ");
    const details = `매주 월요일 06:00, 직전 7영업일 판매 개수 ÷ 7로 평가합니다. 휴업일도 포함합니다. ${thresholds}. 달성한 등급은 유지합니다. 마지막 평가 평균 ${guild.average.toFixed(2)}개, 다음 평가 ${nextEvaluation}일째 월요일. 현재 지원품: ${Object.entries(guildSupplies(s)).map(([id, n]) => `${names[id]} ${n}개`).join(", ")}. 판매량은 ${guild.joinedDay}일째부터 기록하며 완전한 7일이 쌓인 주부터 평가합니다. 지원품은 하루 한 번이며 등급이 올라도 당일 재수령할 수 없습니다.`;
    const pages = (node.pages || []).map((p) => ({ ...p,
      text: p.text.replaceAll("{gradeLine}", this.story.gradeLines?.[guild.grade] || "").replaceAll("{guildDetails}", details),
    }));
    const actions = (node.choices || [])
      .filter((choice) => choice.condition !== "lotusTaste" || c.lotusTaste)
      .map((choice) => [choice.label, () => {
        if (turn === this.turn && this.valid()) this.go(choice.next);
      }, choice.requiresBread && !(s.items.berrybread >= 1)]);
    let finished = false;
    const finish = () => {
      if (finished || turn !== this.turn || !this.valid() || g.ui.open === false) return;
      finished = true;
      if (node.action && !civicAction(s, node.action)) {
        g.ui.close();
        return;
      }
      if (node.action === "acceptGift") g.ui.notify("부탁 수락 · 하트 스티커가 붙은 선물");
      if (node.action === "deliverGift") g.ui.notify("선물을 전했어요. 마틴에게 돌아가 답을 전하세요.");
      if (node.action === "reportGift") g.ui.notify("부탁 완료 · 하트 스티커가 붙은 선물");
      if (node.next) this.go(node.next);
      else g.ui.close();
    };
    // Choices-only nodes reuse a neutral prompt without replaying the greeting.
    if (!pages.length && !actions.length) { g.ui.close(); return; }
    g.ui.say(this.actor, pages.length ? pages : [{ text: "무슨 이야기를 할까요?", kind: "narration", speaker: "이야기" }], actions,
      { role: this.actor.role || this.actor.personality, immediateChoices: !pages.length, onComplete: finish });
  }
}
export function openCivicDialogue(g, key) {
  if (g.state.scene !== "hall") return;
  const story = new CivicStory(g, key);
  story.start();
  return story;
}

export function validateCivicStories(stories) {
  const actions = ["taste", "berryGift", "acceptGift", "deliverGift", "reportGift"];
  for (const story of Object.values(stories)) {
    if (!story.nodes?.[story.entry]) throw Error("마을회관 대화 시작점 누락");
    for (const node of Object.values(story.nodes)) {
      if (node.action && !actions.includes(node.action)) throw Error("잘못된 마을회관 동작");
      for (const link of [node.next, ...(node.choices || []).map((c) => c.next)].filter(Boolean))
        if (!story.nodes[link]) throw Error("마을회관 대화 연결 누락");
      for (const p of node.pages || [])
        if (typeof p.text !== "string") throw Error("잘못된 마을회관 대사");
    }
  }
  return true;
}
