import { receiveParcel } from "./shop.js";
import { leaveInterior } from "./interior.js";
export function staffEntry(s, scene, story) {
  if (scene !== "post") return story.entry;
  return s.dialogueVisits?.postDay === s.day || s.parcelDay === s.day
    ? story.repeat
    : story.entry;
}
export function validateStaffStories(stories) {
  for (const story of Object.values(stories)) {
    if (
      !story.nodes[story.entry] ||
      (story.repeat && !story.nodes[story.repeat])
    )
      throw Error("대화 시작점 누락");
    for (const node of Object.values(story.nodes)) {
      if (node.next && !story.nodes[node.next]) throw Error("대화 연결 누락");
      if (node.action && !["exit", "parcel", "shop"].includes(node.action))
        throw Error("잘못된 대화 동작");
      for (const choice of node.choices || []) {
        if (
          !story.nodes[choice.next] ||
          typeof choice.label !== "string" ||
          (choice.condition && choice.condition !== "unclaimedParcel")
        )
          throw Error("잘못된 선택지");
      }
      for (const page of node.pages || [])
        if (typeof page.text !== "string") throw Error("잘못된 대사");
    }
  }
  return true;
}
export class StaffStory {
  constructor(g, scene) {
    this.g = g;
    this.scene = scene;
    this.staff = g.data.serviceDialogues.staff[scene];
    this.story = g.data.staffStories[scene];
    this.lastPage = { text: "" };
  }
  start() {
    const id = staffEntry(this.g.state, this.scene, this.story);
    this.g.ui.serviceAccess = null;
    if (this.scene === "post") {
      this.g.state.dialogueVisits ??= { postDay: 0 };
      this.g.state.dialogueVisits.postDay = this.g.state.day;
    }
    this.go(id);
  }
  go(id) {
    const { g } = this;
    if (g.state.scene !== this.scene) {
      g.ui.close();
      return;
    }
    const node = this.story.nodes[id];
    if (!node) throw Error("대화 노드가 없습니다: " + id);
    this.node = id;
    const choices = (node.choices || [])
      .filter(
        (c) =>
          c.condition !== "unclaimedParcel" ||
          g.state.parcelDay !== g.state.day,
      )
      .map((c) => [c.label, () => this.go(c.next)]);
    const pages = node.pages?.length ? node.pages : [this.lastPage];
    if (node.pages?.length) this.lastPage = node.pages.at(-1);
    if (!node.pages?.length && !choices.length) {
      this.finish(node);
      return;
    }
    const options = {
      role: this.staff.role,
      speakers: this.story.speakers || [],
      immediateChoices: !node.pages?.length,
      onComplete: () => this.finish(node),
    };
    g.ui.say(this.staff, pages, choices, options);
  }
  finish(node) {
    const { g } = this;
    if (g.state.scene !== this.scene) {
      g.ui.close();
      return;
    }
    if (node.action === "exit") {
      g.ui.close();
      g.ui.serviceAccess = null;
      leaveInterior(g.state);
      g.keys?.clear();
      return;
    }
    if (node.action === "parcel" && this.scene === "post") {
      const received = receiveParcel(g.state);
      g.ui.close();
      g.ui.notify(
        received
          ? "서명을 마치고 소포를 받았어요! 밀가루 4개와 꿀 1개를 가방에 넣었습니다."
          : "오늘의 소포는 이미 받았어요.",
      );
      return;
    }
    if (node.action === "shop" && ["store", "cafe"].includes(this.scene)) {
      g.ui.serviceAccess = this.scene;
      g.ui.show(this.scene === "store" ? "supplies" : "cafe");
      return;
    }
    if (node.next) {
      this.go(node.next);
      return;
    }
    g.ui.close();
  }
}
