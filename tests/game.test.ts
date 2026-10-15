import { describe, it, expect } from "vitest";
import {
  heroes,
  enemies,
  stages,
  raids,
  items,
  quests,
  achievements,
  advantage,
  elements,
  basic,
} from "../src/content";
import {
  freshSave,
  validateSave,
  train,
  rankUp,
  recruit,
  ascend,
  upgradeAbility,
  addGear,
  equip,
  enhance,
  sell,
  claim,
  summon,
  craft,
  grantReward,
  stats,
  addXP,
} from "../src/state";
import {
  createBattle,
  makeHero,
  makeEnemy,
  damage,
  applyStatus,
  has,
  nextTurn,
  act,
  autoStep,
  chooseAI,
  available,
  targetsFor,
  effectiveSpeed,
  type Battle,
} from "../src/combat";
function battle(): Battle {
  return createBattle(freshSave(), 0, 1, false, 123);
}
function resolve(b: Battle) {
  let i = 0;
  while (!b.winner && i++ < 2000) autoStep(b);
  return i;
}
describe("complete content", () => {
  it("has exact hero roster and complete abilities", () => {
    expect(heroes).toHaveLength(20);
    expect(new Set(heroes.map((h) => h.name)).size).toBe(20);
    heroes.forEach((h) => {
      expect(h.abilities).toHaveLength(3);
      expect(h.passive).toContain(":");
      expect(h.description.length).toBeGreaterThan(20);
    });
  });
  it("has campaign, raids, enemies, equipment and attainable objectives", () => {
    expect(stages).toHaveLength(30);
    expect(raids).toHaveLength(12);
    expect(enemies.length).toBeGreaterThanOrEqual(30);
    expect(enemies.filter((e) => e.id.startsWith("boss"))).toHaveLength(6);
    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(quests).toHaveLength(30);
    expect(achievements).toHaveLength(20);
    for (const q of [...quests, ...achievements])
      expect([
        "campaign",
        "battles",
        "dungeons",
        "raids",
        "upgrades",
        "recruits",
        "chests",
      ]).toContain(q.metric);
  });
});
describe("combat rules", () => {
  it("orders living combatants by speed", () => {
    const b = battle();
    const sorted = [...b.units].sort((a, c) => c.speed - a.speed);
    expect(b.current).toBe(sorted[0].id);
    expect(b.queue).toHaveLength(b.units.length - 1);
  });
  it("modifies damage through defense and elemental advantage", () => {
    const b = battle(),
      a = b.units[0],
      t = b.units[4];
    a.crit = 0;
    a.element = "Fire";
    t.element = "Nature";
    const hp = t.hp;
    const hit = damage(b, a, t, 1);
    expect(hit.amount).toBeGreaterThan(0);
    expect(t.hp).toBe(hp - hit.amount);
    t.hp = t.maxHp;
    t.def *= 10;
    expect(damage(b, a, t, 1).amount).toBeLessThan(hit.amount);
  });
  it("has consistent and finite elemental matchups", () => {
    expect(advantage("Fire", "Nature")).toBe(1.25);
    expect(advantage("Nature", "Fire")).toBe(0.8);
    expect(advantage("Light", "Dark")).toBe(1.25);
    expect(advantage("Dark", "Light")).toBe(1.25);
    for (const a of elements)
      for (const b of elements)
        expect([0.8, 1, 1.25]).toContain(advantage(a, b));
  });
  it("rejects invalid targets without consuming focus or cooldown", () => {
    const b = battle(),
      u = b.units.find((u) => u.id === b.current)!;
    const mana = u.mana;
    expect(() => act(b, 0, "missing")).toThrow();
    expect(u.mana).toBe(mana);
    expect(u.cooldowns[0]).toBe(0);
  });
  it("blocks abilities through silence and insufficient focus", () => {
    const b = battle(),
      u = b.units[0];
    applyStatus(u, "Silence");
    expect(available(b, u, 0)).toBe(false);
    expect(available(b, u, -1)).toBe(true);
    u.effects = [];
    u.mana = 0;
    expect(available(b, u, 0)).toBe(false);
  });
  it("enforces and advances cooldowns", () => {
    const b = battle(),
      u = b.units.find((u) => u.id === b.current)!;
    act(b, 0, targetsFor(b, u, u.abilities[0])[0].id);
    expect(u.cooldowns[0]).toBe(u.abilities[0].cooldown + 1);
    let count = 0;
    while (b.current !== u.id && !b.winner && count++ < 100) {
      if (b.current) {
        const v = b.units.find((x) => x.id === b.current)!,
          a = chooseAI(b, v);
        act(b, a.index, a.targetId);
      }
      nextTurn(b);
    }
    expect(u.cooldowns[0]).toBe(u.abilities[0].cooldown);
  });
  it("caps damage stacks and refreshes other statuses", () => {
    const u = battle().units[0];
    for (let i = 0; i < 5; i++) {
      applyStatus(u, "Poison");
      applyStatus(u, "Defense Up");
    }
    expect(u.effects.find((e) => e.name === "Poison")!.stacks).toBe(3);
    expect(u.effects.find((e) => e.name === "Defense Up")!.stacks).toBe(1);
  });
  it("ticks poison and regeneration, then expires them", () => {
    const b = battle(),
      u = b.units[0];
    u.hp -= 50;
    applyStatus(u, "Regeneration", 1);
    b.queue = [u.id];
    b.current = null;
    const old = u.hp;
    nextTurn(b);
    expect(u.hp).toBeGreaterThan(old);
    act(b, -2);
    expect(has(u, "Regeneration")).toBe(false);
    u.shield = 0;
    applyStatus(u, "Poison", 1);
    b.queue = [u.id];
    b.current = null;
    const hp = u.hp;
    nextTurn(b);
    expect(u.hp).toBeLessThan(hp);
    act(b, -2);
    expect(has(u, "Poison")).toBe(false);
  });
  it("stun skips exactly its specified turns", () => {
    const b = battle(),
      u = b.units[0];
    applyStatus(u, "Stun", 2);
    b.queue = [u.id, u.id, u.id];
    b.current = null;
    expect(nextTurn(b)?.id).toBe(u.id);
    expect(has(u, "Stun")).toBe(false);
    expect(b.log.filter((l) => l.includes("cannot act"))).toHaveLength(2);
  });
  it("respects taunt target restrictions", () => {
    const b = battle(),
      u = b.units[0],
      t = b.units[4];
    applyStatus(t, "Taunt");
    expect(targetsFor(b, u, basic).map((v) => v.id)).toEqual([t.id]);
  });
  it("shield absorbs damage and invulnerability blocks it", () => {
    const b = battle(),
      a = b.units[0],
      t = b.units[4];
    t.shield = 1000;
    const hp = t.hp;
    expect(damage(b, a, t, 1).amount).toBe(0);
    expect(t.hp).toBe(hp);
    t.shield = 0;
    applyStatus(t, "Invulnerability");
    expect(damage(b, a, t, 9).amount).toBe(0);
  });
  it("has haste and slow speed modifiers", () => {
    const u = battle().units[0];
    applyStatus(u, "Haste");
    expect(effectiveSpeed(u)).toBeGreaterThan(u.speed);
    applyStatus(u, "Slow");
    expect(effectiveSpeed(u)).toBeCloseTo(u.speed * 1.4 * 0.6);
  });
  it("summons real allies with a five-unit cap", () => {
    const s = freshSave();
    s.heroes.h6.unlocked = true;
    s.party = ["h6"];
    const b = createBattle(s, 0, 1);
    const u = b.units[0];
    for (let i = 0; i < 7; i++) {
      b.current = u.id;
      u.mana = 10;
      u.cooldowns = [0, 0, 0];
      act(b, 0, u.id);
    }
    expect(b.units.filter((u) => u.side === "hero")).toHaveLength(5);
    expect(b.units.some((u) => u.summoned && u.atk > 0)).toBe(true);
  });
  it("bosses telegraph and enrage below half health", () => {
    const b = createBattle(freshSave(), 0, 5, true);
    const boss = b.units.find((u) => u.boss)!;
    boss.hp = boss.maxHp * 0.4;
    b.queue = [boss.id];
    b.current = null;
    const atk = boss.atk;
    nextTurn(b);
    expect(boss.phase).toBe(1);
    expect(boss.atk).toBeGreaterThan(atk);
    expect(boss.cooldowns[0]).toBe(0);
  });
  it("AI heals injured allies rather than choosing randomly", () => {
    const b = battle(),
      u = makeEnemy("e0-2", 1, 9);
    b.units.push(u);
    b.units[4].hp = 1;
    expect(chooseAI(b, u).index).toBe(0);
    expect(chooseAI(b, u).targetId).toBe(b.units[4].id);
  });
  it("ends a seeded battle deterministically", () => {
    const b = battle(),
      c = battle();
    resolve(b);
    resolve(c);
    expect(b.winner).toBe("hero");
    expect(b.units.map((u) => u.hp)).toEqual(c.units.map((u) => u.hp));
  });
  it.each([
    "Shielded garrison",
    "Toxic air",
    "Diminished healing",
    "Reinforcements",
    "Elemental surge",
    "Elite guard",
  ])("resolves raid modifier %s without invalid health", (modifier) => {
    const s = freshSave();
    s.party.forEach((id) => (s.heroes[id].level = 5));
    const b = createBattle(s, 0, 2, true, 15, undefined, modifier);
    resolve(b);
    expect(b.winner).not.toBeNull();
    b.units.forEach((u) =>
      expect(Number.isFinite(u.hp) && u.hp >= 0).toBe(true),
    );
  });
});
describe("persistent progression", () => {
  it("levels with XP and applies stat growth", () => {
    const s = freshSave(),
      before = stats(s, "h0");
    addXP(s, "h0", 210);
    expect(s.heroes.h0.level).toBe(3);
    expect(stats(s, "h0").atk).toBeGreaterThan(before.atk);
  });
  it("training costs gold and increments upgrades", () => {
    const s = freshSave();
    train(s, "h0");
    expect(s.gold).toBe(705);
    expect(s.heroes.h0.level).toBe(2);
    expect(s.metrics.upgrades).toBe(1);
  });
  it("protects against unaffordable upgrades", () => {
    const s = freshSave();
    s.gold = 0;
    expect(() => train(s, "h0")).toThrow();
    expect(s.heroes.h0.level).toBe(1);
  });
  it("targeted shards recruit and star rank", () => {
    const s = freshSave();
    summon(s, "h4");
    recruit(s, "h4");
    expect(s.heroes.h4.unlocked).toBe(true);
    s.heroes.h4.shards = 10;
    rankUp(s, "h4");
    expect(s.heroes.h4.stars).toBe(2);
    expect(s.metrics.recruits).toBe(5);
  });
  it("locks advanced abilities and ascension behind levels", () => {
    const s = freshSave();
    expect(() => upgradeAbility(s, "h0", 2)).toThrow();
    expect(() => ascend(s, "h0")).toThrow();
    s.heroes.h0.level = 5;
    ascend(s, "h0");
    expect(s.heroes.h0.ascension).toBe(1);
  });
  it("equipment affects stats, transfers exclusively and enhances", () => {
    const s = freshSave(),
      before = stats(s, "h0");
    equip(s, "h0", "g0");
    expect(stats(s, "h0").atk).toBeGreaterThan(before.atk);
    enhance(s, "g0");
    expect(stats(s, "h0").atk).toBeGreaterThan(before.atk + 4);
    equip(s, "h1", "g0");
    expect(s.heroes.h0.equipment.Weapon).toBeUndefined();
    expect(s.heroes.h1.equipment.Weapon).toBe("g0");
    expect(() => sell(s, "g0")).toThrow();
  });
  it("crafts all rarities and slots and sells unbound gear", () => {
    const s = freshSave();
    s.gold = 1e6;
    s.ore = 1e5;
    for (let t = 0; t < 5; t++)
      for (let slot = 0; slot < 3; slot++) {
        const g = craft(s, t, slot),
          d = items.find((i) => i.id === g.id)!;
        expect(d.rarity).toBe(
          ["Common", "Uncommon", "Rare", "Epic", "Legendary"][t],
        );
        expect(d.slot).toBe(["Weapon", "Armor", "Accessory"][slot]);
        const n = s.inventory.length;
        sell(s, g.uid);
        expect(s.inventory).toHaveLength(n - 1);
      }
  });
  it("claims objectives only once after completion", () => {
    const s = freshSave();
    expect(() => claim(s, "q0")).toThrow();
    s.metrics.campaign = 5;
    claim(s, "q0");
    expect(s.claimed).toContain("q0");
    expect(() => claim(s, "q0")).toThrow();
  });
  it("first clear and repeat rewards advance campaign correctly", () => {
    const s = freshSave();
    const a = grantReward(s, 0);
    expect(a.first).toBe(true);
    expect(s.campaign).toBe(1);
    expect(s.clears).toEqual([0]);
    const b = grantReward(s, 0);
    expect(b.first).toBe(false);
    expect(a.gold).toBeGreaterThan(b.gold);
    expect(s.campaign).toBe(1);
    expect(s.metrics.dungeons).toBe(2);
  });
  it("raid completion rewards scale and preserve campaign", () => {
    const s = freshSave();
    const r = grantReward(s, 0, true, 2);
    expect(s.raidWins).toEqual([0]);
    expect(s.campaign).toBe(0);
    expect(r.gold).toBeGreaterThan(grantReward(freshSave(), 0, true, 0).gold);
  });
  it("roundtrips a progressed save with equipment and settings", () => {
    const s = freshSave();
    train(s, "h0");
    equip(s, "h0", "g0");
    grantReward(s, 0);
    expect(validateSave(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it.each([
    { version: 99 },
    { gold: -1 },
    { gold: NaN },
    { party: ["h19"] },
    { inventory: [{ uid: "bad", id: "unknown", level: 1 }] },
    { settings: { music: 9, sfx: 1, speed: 1, shadows: true } },
  ])("rejects corrupt import %o", (change) => {
    expect(() => validateSave({ ...freshSave(), ...change })).toThrow();
  });
  it("all heroes can be obtained entirely with earned gems", () => {
    const s = freshSave();
    for (let i = 0; i < 30; i++) grantReward(s, i);
    for (const h of heroes) {
      if (!s.heroes[h.id].unlocked) {
        while (s.heroes[h.id].shards < 10) summon(s, h.id);
        recruit(s, h.id);
      }
    }
    expect(Object.values(s.heroes).every((h) => h.unlocked)).toBe(true);
  });
});
