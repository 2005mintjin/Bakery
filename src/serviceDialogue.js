import { StaffStory } from "./staffStory.js";
import { serve } from "./shop.js";
import { names } from "./inventory.js";
export const customerChoices = [
  ["serve", "네, 금방 갖다 드릴게요!"],
  ["later", "아직 빵이 준비가 안 됐네요."],
  ["decline", "오늘 그 빵은 더 못 팔아요."],
];
export function customerWords(dialogues, customer) {
  return dialogues.customers[customer.portrait] || dialogues.customers.mira;
}
export function orderText(dialogues, customer) {
  return customerWords(dialogues, customer)
    .order.replaceAll("{bread}", names[customer.bread] || "빵")
    .replaceAll("{count}", String(customer.quantity ?? 1));
}
export function resolveCustomerReply(s, action, recipes) {
  const c = s.shop.customer;
  if (!c || c.phase !== "waiting") return "unavailable";
  if (action === "serve") return serve(s, recipes) ? "served" : "missing";
  if (action === "later") return "waiting";
  if (action === "decline") {
    s.shop.customer = null;
    s.shop.elapsed = 0;
    return "dismissed";
  }
  return "unavailable";
}
export const staffServices = {
  parcel: { key: "post", scene: "post" },
  supplies: { key: "store", scene: "store" },
  cafe: { key: "cafe", scene: "cafe" },
  workshopMolds: { key: "mold", scene: "workshop" },
  workshopOven: { key: "furnace", scene: "workshop" },
};
export function hasStaffAccess(g, panel) {
  const target = staffServices[panel];
  return (
    !!target &&
    g.state.scene === target.scene &&
    g.ui.serviceAccess === target.key
  );
}
function escape(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function dialoguePanel(ui, person, text, actions, role = "") {
  if (ui.say) return ui.say(person, [text], actions, { role });
  ui.panel(
    "<h2>" + escape(person.name) + "</h2><p>" + escape(text) + "</p>",
    actions,
  );
}
export function openCustomerDialogue(g) {
  const c = g.state.shop.customer;
  if (g.state.scene !== "bakery" || c?.phase !== "waiting") {
    g.ui.notify("아직 카운터에 도착한 손님이 없어요");
    return;
  }
  const words = customerWords(g.data.serviceDialogues, c);
  const npc =
    g.data.customers?.find((n) => n.portrait === c.portrait) ||
    g.data.npcs?.find((n) => n.id === c.portrait);
  const actor = {
    ...c,
    ...(npc ? { name: npc.name, portraitAsset: npc.portraitAsset } : {}),
  };
  const render = (text = orderText(g.data.serviceDialogues, c)) =>
    dialoguePanel(
      g.ui,
      actor,
      text,
      customerChoices.map(([action, label]) => [
        label,
        () => {
          if (g.state.shop.customer !== c) {
            g.ui.close();
            return;
          }
          const result = resolveCustomerReply(g.state, action, g.data.recipes);
          if (result === "served")
            dialoguePanel(
              g.ui,
              actor,
              words.thanks,
              [["대화 마치기", () => g.ui.close()]],
              "손님",
            );
          else if (result === "missing") {
            render(
              orderText(g.data.serviceDialogues, c) +
                "\n\n아직 진열대에 " +
                names[c.bread] +
                " " +
                (c.quantity ?? 1) +
                "개가 필요해요. 주문 수량을 모두 진열한 뒤 다시 말해 주세요.",
            );
          } else if (result === "waiting") {
            g.ui.close();
            g.ui.notify(words.later);
          } else if (result === "dismissed")
            dialoguePanel(
              g.ui,
              actor,
              words.decline,
              [["안녕히 가세요.", () => g.ui.close()]],
              "손님",
            );
          else g.ui.close();
        },
      ]),
      "손님",
    );
  render();
}
export function openStaffDialogue(g, scene) {
  const staff = g.data.serviceDialogues.staff[scene];
  if (!staff || g.state.scene !== (staff.location || scene)) {
    g.ui.notify("해당 장소의 직원에게 먼저 말을 걸어 주세요");
    return;
  }
  const conversation = new StaffStory(g, scene);
  conversation.start();
  return conversation;
}
