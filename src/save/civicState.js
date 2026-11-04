import { freshGuild, guildDay } from "../guild.js";
export function validateCivicState(s) {
  if (s.civic === undefined) s.civic = { lotusTaste: false, martinGift: "none" };
  const c = s.civic;
  if (!c || Array.isArray(c) || typeof c !== "object" ||
      typeof c.lotusTaste !== "boolean" ||
      !["none", "carrying", "delivered", "done"].includes(c.martinGift))
    throw Error("손상된 마을회관 기록");
  if ((c.martinGift === "none" && s.quests.martinGift !== undefined) ||
      (["carrying", "delivered"].includes(c.martinGift) && s.quests.martinGift !== "active") ||
      (c.martinGift === "done" && s.quests.martinGift !== "done"))
    throw Error("손상된 선물 부탁 기록");
  if (s.guild === undefined) s.guild = freshGuild(s);
  const g = s.guild, today = guildDay(s);
  if (!g || Array.isArray(g) || !["A", "B", "C", "D"].includes(g.grade) ||
      !Number.isSafeInteger(g.joinedDay) || g.joinedDay < 1 || g.joinedDay > today ||
      !Number.isSafeInteger(g.evaluated) || g.evaluated < 1 || g.evaluated > today ||
      (g.evaluated - 1) % 7 !== 0 ||
      !Number.isFinite(g.average) || g.average < 0 ||
      !g.sales || typeof g.sales !== "object" || Array.isArray(g.sales) ||
      Object.entries(g.sales).some(([day, count]) =>
        !/^[1-9]\d*$/.test(day) || !Number.isSafeInteger(Number(day)) ||
        Number(day) < g.joinedDay || Number(day) > today ||
        !Number.isSafeInteger(count) || count < 0))
    throw Error("손상된 조합 등급 기록");
}
