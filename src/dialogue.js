import { TownStory } from "./townStory.js";
import { accept, complete } from "./quest.js";
export function talk(game, n) {
  if (game.data.townStories?.[n.id]) {
    const story = new TownStory(game, n);
    story.start();
    return story;
  }
  const { state: s, data: d, ui } = game;
  const q = d.quests.find((q) => q.id === n.quest),
    lines = d.dialogues[n.id];
  let text =
    s.quests[q.id] === "done"
      ? lines.after
      : s.quests[q.id] === "active"
        ? lines.active
        : lines.intro;
  const render = (message, buttons) =>
    ui.say({ name: n.name, portrait: n.id }, [message], buttons, {
      role: n.personality,
    });
  const finish = () => {
    if (complete(s, q)) {
      s.affinity[n.id] = (s.affinity[n.id] || 0) + 1;
      render(lines.complete + ` (+${q.reward}G)`, [
        ["다음 · 대화 마치기", () => ui.close()],
      ]);
    } else {
      render("아직 준비가 안 됐구나. " + lines.active, [
        ["다음에 올게요", () => ui.close()],
      ]);
    }
  };
  render(
    text,
    s.quests[q.id] === "done"
      ? [["오늘도 좋은 하루 보내세요", () => ui.close()]]
      : s.quests[q.id] === "active"
        ? [
            [
              q.item
                ? "부탁한 물건을 건넨다"
                : "누구나 처음은 서툴러. 함께 익숙해지자.",
              finish,
            ],
            ["나중에 다시 이야기해요", () => ui.close()],
          ]
        : [
            [
              "이야기를 더 듣는다",
              () =>
                render(lines.offer, [
                  [
                    "제가 도울게요",
                    () => {
                      accept(s, q);
                      render(q.description, [["알겠어요", () => ui.close()]]);
                    },
                  ],
                  ["다음에 이야기해요", () => ui.close()],
                ]),
            ],
            ["인사하고 돌아간다", () => ui.close()],
          ],
  );
}
