import { writeFileSync, mkdirSync } from "node:fs";
import { createBattle, autoStep, type Unit } from "../src/combat";
import {
  freshSave,
  train,
  grantReward,
  summon,
  recruit,
  equip,
  claim,
} from "../src/state";
import { stages, quests, heroes, raids } from "../src/content";
const results: any[] = [];
const perHero = Object.fromEntries(
  heroes.map((h) => [
    h.id,
    { name: h.name, runs: 0, wins: 0, damage: 0, healing: 0, survived: 0 },
  ]),
);
for (const team of [
  ["h0", "h1", "h3", "h4"],
  ["h2", "h5", "h13", "h16"],
  ["h7", "h9", "h14", "h19"],
  ["h6", "h8", "h10", "h11"],
  ["h12", "h15", "h16", "h18"],
  ["h0", "h2", "h13", "h17"],
]) {
  const s = freshSave();
  for (const id of team) s.heroes[id].unlocked = true;
  s.party = team;
  for (const stage of stages) {
    let wins = 0,
      turns = 0;
    for (let seed = 1; seed <= 12; seed++) {
      s.party.forEach((id) => (s.heroes[id].level = stage.level + 1));
      const b = createBattle(s, stage.region, stage.level, stage.boss, seed);
      let actions = 0;
      while (!b.winner && actions++ < 2000) autoStep(b);
      if (b.winner === "hero") wins++;
      turns += actions;
      for (const id of team) {
        perHero[id].runs++;
        if (b.winner === "hero") perHero[id].wins++;
        if (b.units.find((u) => u.id === id)!.hp > 0) perHero[id].survived++;
      }
      for (const event of b.events) {
        const actor = perHero[event.actor];
        if (actor) {
          if (event.type === "attack")
            actor.damage += event.results.reduce((sum, r) => sum + r.value, 0);
          if (event.type === "heal")
            actor.healing += event.results.reduce((sum, r) => sum + r.value, 0);
        }
      }
    }
    results.push({
      team: team.join("/"),
      stage: stage.id + 1,
      level: stage.level + 1,
      wins,
      total: 12,
      meanActions: Math.round(turns / 12),
    });
  }
}
// Fresh-save campaign: no currency injection, four obtainable heroes, earned rewards and affordable training.
const s = freshSave();
summon(s, "h4");
recruit(s, "h4");
s.party = ["h0", "h1", "h3", "h4"];
let failures = 0,
  cleared = 0,
  grind = 0;
for (const stage of stages) {
  for (const id of s.party)
    while (
      s.heroes[id].level < stage.level + 1 &&
      s.gold >= s.heroes[id].level * 45
    )
      train(s, id);
  let success = false;
  for (let attempt = 0; attempt < 10 && !success; attempt++) {
    let carry: Unit[] | undefined;
    success = true;
    for (let encounter = 0; encounter < 3; encounter++) {
      if (encounter === 2 && carry)
        carry.forEach((u) => {
          u.hp = Math.min(
            u.maxHp,
            u.hp <= 0 ? u.maxHp * 0.25 : u.hp + u.maxHp * 0.4,
          );
          u.mana = 10;
          u.cooldowns = [0, 0, 0];
        });
      const b = createBattle(
        s,
        stage.region,
        stage.level,
        encounter === 2 && stage.boss,
        100 + stage.id * 10 + attempt,
        carry,
      );
      let n = 0;
      while (!b.winner && n++ < 2000) autoStep(b);
      if (b.winner !== "hero") {
        success = false;
        break;
      }
      s.metrics.battles++;
      carry = b.units.filter((u) => u.side === "hero");
    }
    if (success) {
      s.gold += 80 + stage.level * 10;
      s.metrics.chests++;
      grantReward(s, stage.id);
      for (const q of quests)
        if (!s.claimed.includes(q.id) && (s.metrics[q.metric] ?? 0) >= q.goal)
          claim(s, q.id);
      cleared++;
    } else {
      failures++;
      if (stage.id === 0) break; // Replay last cleared stage as a real combat grind, then collect its reward.
      const prev = stages[stage.id - 1];
      let replayCarry: Unit[] | undefined,
        replay = true;
      for (let e = 0; e < 3; e++) {
        if (e === 2 && replayCarry)
          replayCarry.forEach((u) => {
            u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.4);
            u.mana = 10;
          });
        const b = createBattle(
          s,
          prev.region,
          prev.level,
          e === 2 && prev.boss,
          attempt + 700,
          replayCarry,
        );
        let n = 0;
        while (!b.winner && n++ < 2000) autoStep(b);
        if (b.winner !== "hero") {
          replay = false;
          break;
        }
        replayCarry = b.units.filter((u) => u.side === "hero");
      }
      if (replay) {
        grantReward(s, prev.id);
        grind++;
      }
      for (const id of s.party)
        while (
          s.heroes[id].level < stage.level + 3 &&
          s.gold >= s.heroes[id].level * 45
        )
          train(s, id);
    }
  }
  if (!success) break;
}
const raidResults = [];
for (const r of raids)
  for (let d = 0; d < 3; d++) {
    const rs = freshSave();
    rs.party = ["h0", "h1", "h3", "h4"];
    rs.heroes.h4.unlocked = true;
    rs.party.forEach(
      (id) => (rs.heroes[id].level = Math.min(60, r.level + d * 5 + 5)),
    );
    let carry: Unit[] | undefined,
      win = true,
      rounds = 0;
    for (let wave = 0; wave <= r.waves; wave++) {
      const b = createBattle(
        rs,
        r.region,
        r.level + d * 5,
        wave === r.waves,
        123 + wave,
        carry,
        r.modifier,
        `commander${r.id}`,
      );
      let n = 0;
      while (!b.winner && n++ < 2000) autoStep(b);
      rounds += b.round;
      if (b.winner !== "hero") {
        win = false;
        break;
      }
      carry = b.units.filter((u) => u.side === "hero");
    }
    raidResults.push({
      raid: r.id + 1,
      difficulty: ["Normal", "Hard", "Nightmare"][d],
      win,
      rounds,
    });
  }
const report = {
  generated: new Date().toISOString(),
  encounters: results,
  heroes: perHero,
  freshCampaign: {
    cleared,
    failures,
    replays: grind,
    gold: s.gold,
    party: s.party.map((id) => ({ id, level: s.heroes[id].level })),
  },
  raids: raidResults,
};
mkdirSync("docs", { recursive: true });
writeFileSync("docs/simulation-results.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      freshCampaign: report.freshCampaign,
      encounterPasses: results.filter((r) => r.wins === r.total).length,
      encounterGroups: results.length,
      raidWins: raidResults.filter((r) => r.win).length,
      raidRuns: raidResults.length,
    },
    null,
    2,
  ),
);
if (cleared !== 30) process.exitCode = 1;
