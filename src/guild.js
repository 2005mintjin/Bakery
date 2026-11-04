// Day 1 is Monday; evaluations use completed 06:00–06:00 working days.
export const guildRules = [
  { grade: "D", average: 0, supplies: { flour: 4, honey: 1 } },
  { grade: "C", average: 5, supplies: { flour: 8, honey: 2, yeast: 2, salt: 2 } },
  { grade: "B", average: 10, supplies: { flour: 12, honey: 3, yeast: 4, salt: 4, butter: 2, sugar: 2 } },
  { grade: "A", average: 20, supplies: { flour: 20, honey: 5, yeast: 6, salt: 6, butter: 4, sugar: 4, chocolate: 2 } },
];
export const guildDay = (s) => Math.max(1, s.day - (s.minutes < 360 ? 1 : 0));
export function freshGuild(s) {
  const day = guildDay(s);
  return { grade: "D", joinedDay: day, evaluated: day - ((day - 1) % 7), average: 0, sales: {} };
}
export function syncGuild(s) {
  const g = (s.guild ??= freshGuild(s)), today = guildDay(s);
  const monday = today - ((today - 1) % 7);
  if (monday > g.evaluated) {
    // Handle every crossed Monday, including multi-day clock jumps, before pruning.
    for (let day = g.evaluated + 7; day <= monday; day += 7) {
      if (day - 7 >= g.joinedDay) {
        let count = 0;
        for (let i = day - 7; i < day; i++) count += g.sales[i] || 0;
        g.average = count / 7;
        const earned = guildRules.filter((r) => r.average <= g.average).at(-1);
        if (guildRules.findIndex((r) => r.grade === earned.grade) >
            guildRules.findIndex((r) => r.grade === g.grade)) g.grade = earned.grade;
      }
    }
    g.evaluated = monday;
    for (const day of Object.keys(g.sales)) if (Number(day) < monday) delete g.sales[day];
  }
  return g;
}
export function recordGuildSale(s, quantity) {
  const g = syncGuild(s), day = guildDay(s);
  g.sales[day] = (g.sales[day] || 0) + quantity;
}
export function guildSupplies(s) {
  return guildRules.find((r) => r.grade === syncGuild(s).grade).supplies;
}
