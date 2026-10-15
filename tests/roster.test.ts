import { describe, it, expect } from "vitest";
import { heroes, type Status } from "../src/content";
import { freshSave, equip, addGear, validateSave } from "../src/state";
import {
  createBattle,
  act,
  targetsFor,
  applyStatus,
  nextTurn,
  damage,
  has,
  autoStep,
  type Battle,
} from "../src/combat";
describe("all hero abilities are executable content", () => {
  for (const h of heroes)
    for (let skill = 0; skill < 3; skill++)
      it(`${h.name}: ${h.abilities[skill].name}`, () => {
        const s = freshSave();
        s.heroes[h.id].unlocked = true;
        s.heroes[h.id].level = 5;
        s.party = [h.id];
        const b = createBattle(s, 0, 5, false, 71),
          u = b.units[0];
        b.current = u.id;
        u.hp = Math.floor(u.maxHp * 0.5);
        const a = u.abilities[skill],
          target = targetsFor(b, u, a)[0];
        const mana = u.mana;
        const e = act(b, skill, target.id);
        expect(e.ability).toBe(a.name);
        expect(u.mana).toBe(mana - a.cost);
        expect(u.cooldowns[skill]).toBeGreaterThan(0);
        expect(b.units.every((u) => Number.isFinite(u.hp) && u.hp >= 0)).toBe(
          true,
        );
        if (a.heal) expect(e.results.some((r) => r.value > 0)).toBe(true);
        if (a.summon) expect(b.units.some((u) => u.summoned)).toBe(true);
        if (a.power && !a.heal)
          expect(e.results.some((r) => r.value > 0)).toBe(true);
      });
});
describe("status system coverage", () => {
  it.each([
    "Poison",
    "Burn",
    "Bleed",
    "Freeze",
    "Stun",
    "Slow",
    "Haste",
    "Shield",
    "Regeneration",
    "Defense Up",
    "Defense Down",
    "Attack Up",
    "Attack Down",
    "Taunt",
    "Silence",
    "Curse",
    "Invulnerability",
    "Damage over Time",
  ] as Status[])("%s expires after its duration", (status) => {
    const b = createBattle(freshSave(), 0, 1);
    const u = b.units[0];
    applyStatus(u, status, 1);
    b.current = null;
    b.queue = [u.id];
    nextTurn(b);
    if (b.current === u.id) act(b, -1, b.units[4].id);
    expect(has(u, status)).toBe(false);
  });
  it("cleanse removes harmful effects but retains buffs", () => {
    const s = freshSave();
    s.heroes.h10.unlocked = true;
    s.heroes.h10.level = 5;
    s.party = ["h10"];
    const b = createBattle(s, 0, 1),
      u = b.units[0];
    u.hp -= 30;
    applyStatus(u, "Poison");
    applyStatus(u, "Defense Up");
    b.current = u.id;
    act(b, 1, u.id);
    expect(has(u, "Poison")).toBe(false);
    expect(has(u, "Defense Up")).toBe(true);
  });
  it("freeze breaks on damage and invulnerability stops hostile statuses", () => {
    const b = createBattle(freshSave(), 0, 1),
      u = b.units[0],
      t = b.units[4];
    applyStatus(t, "Freeze");
    b.current = u.id;
    act(b, -1, t.id);
    expect(has(t, "Freeze")).toBe(false);
    applyStatus(t, "Invulnerability");
    applyStatus(t, "Poison");
    expect(has(t, "Poison")).toBe(false);
  });
  it("elemental equipment resistance reduces received damage", () => {
    const s = freshSave();
    equip(s, "h0", "g0");
    const b = createBattle(s, 0, 1),
      a = b.units[4],
      t = b.units[0];
    a.element = "Light";
    a.crit = 0;
    const n = damage(b, a, t, 1).amount;
    t.hp = t.maxHp;
    t.resist = {};
    const m = damage(b, a, t, 1).amount;
    expect(n).toBeLessThanOrEqual(m);
  });
});

it("Mira’s passive shield remains active after her action", () => {
  const s = freshSave();
  s.party = ["h16"];
  s.heroes.h16.unlocked = true;
  const b = createBattle(s, 0, 1),
    u = b.units[0];
  b.current = null;
  b.queue = [u.id];
  nextTurn(b);
  expect(u.shield).toBeGreaterThan(0);
  act(b, -1, b.units[1].id);
  expect(u.shield).toBeGreaterThan(0);
  expect(has(u, "Shield")).toBe(true);
});
