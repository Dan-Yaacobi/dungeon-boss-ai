import {
  heroes,
  enemies,
  items,
  basic,
  guard,
  advantage,
  type Ability,
  type Element,
  type Status,
} from "./content";
import { stats, type Save } from "./state";
export interface Effect {
  name: Status;
  turns: number;
  stacks: number;
  fresh: boolean;
}
export interface Unit {
  id: string;
  defId: string;
  name: string;
  element: Element;
  role: string;
  look: string;
  side: "hero" | "enemy";
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  crit: number;
  mana: number;
  abilities: Ability[];
  cooldowns: number[];
  effects: Effect[];
  shield: number;
  level: number;
  boss: boolean;
  phase: number;
  summoned: boolean;
  turns: number;
  resist?: Partial<Record<Element, number>>;
  renewal?: boolean;
}
export interface CombatEvent {
  actor: string;
  targets: string[];
  ability: string;
  type: "attack" | "heal" | "buff" | "tick" | "summon";
  results: {
    id: string;
    value: number;
    crit: boolean;
    dead: boolean;
    label?: string;
  }[];
  element: Element;
}
export interface Battle {
  units: Unit[];
  queue: string[];
  current: string | null;
  round: number;
  winner: "hero" | "enemy" | null;
  log: string[];
  events: CombatEvent[];
  modifier: string;
  seed: number;
  serial: number;
}
export function rng(b: Battle) {
  b.seed = (Math.imul(b.seed, 1664525) + 1013904223) >>> 0;
  return b.seed / 4294967296;
}
export const has = (u: Unit, s: Status) =>
  u.effects.some((e) => e.name === s && e.turns > 0);
export const living = (b: Battle, side: Unit["side"]) =>
  b.units.filter((u) => u.side === side && u.hp > 0);
export function makeHero(s: Save, id: string): Unit {
  const h = heroes.find((x) => x.id === id)!,
    p = s.heroes[id],
    st = stats(s, id);
  const gear = Object.values(p.equipment)
    .map((uid) => s.inventory.find((g) => g.uid === uid))
    .filter(Boolean);
  const resist: Partial<Record<Element, number>> = {};
  for (const g of gear) {
    const item = items.find((i) => i.id === g!.id)!;
    resist[item.resistance] = (resist[item.resistance] ?? 0) + 0.1;
  }
  return {
    id,
    defId: id,
    name: h.name,
    element: h.element,
    role: h.role,
    look: h.look,
    side: "hero",
    resist,
    renewal: gear.some((g) => Number(g!.id.slice(4)) >= 36),
    ...st,
    maxHp: st.hp,
    mana: 6,
    abilities: h.abilities
      .map((a, i) => ({
        ...a,
        power: a.power * (1 + (p.abilities[i] - 1) * 0.1),
      }))
      .filter((_, i) => p.level >= [1, 3, 5][i]),
    cooldowns: [0, 0, 0],
    effects: [],
    shield: 0,
    level: p.level,
    boss: false,
    phase: 0,
    summoned: false,
    turns: 0,
  };
}
export function makeEnemy(defId: string, level: number, index = 0): Unit {
  const d = enemies.find((e) => e.id === defId)!;
  return {
    id: `${defId}:${index}`,
    defId,
    name: d.name,
    element: d.element,
    role: d.role,
    look: d.look,
    side: "enemy",
    hp: Math.round((d.boss ? 600 : 72) + level * (d.boss ? 100 : 17)),
    maxHp: Math.round((d.boss ? 600 : 72) + level * (d.boss ? 100 : 17)),
    atk: 13 + level * 3,
    def: 4 + level * 1.1,
    speed: 9 + (index % 5) * 2,
    crit: 0.08,
    mana: 8,
    abilities: d.abilities,
    cooldowns: [0, 0, 0],
    effects: [],
    shield: 0,
    level,
    boss: d.boss,
    phase: 0,
    summoned: false,
    turns: 0,
  };
}
export function createBattle(
  s: Save,
  region: number,
  level: number,
  boss = false,
  seed = 42,
  carry?: Unit[],
  modifier = "",
  bossId?: string,
): Battle {
  const party = carry
    ? carry
        .filter((u) => !u.summoned)
        .map((u) => ({
          ...structuredClone(u),
          effects: [],
          shield: 0,
          mana: Math.min(10, u.mana + 2),
        }))
    : s.party.map((id) => makeHero(s, id));
  const defs = boss
    ? [bossId ?? `boss${region}`, `e${region}-2`, `e${region}-0`]
    : Array.from(
        { length: Math.min(4, 2 + Math.floor(level / 9)) },
        (_, i) => `e${region}-${(i + level) % 5}`,
      );
  const foes = defs.map((id, i) => makeEnemy(id, level, i));
  const b: Battle = {
    units: [...party, ...foes],
    queue: [],
    current: null,
    round: 0,
    winner: null,
    log: [],
    events: [],
    modifier,
    seed,
    serial: 0,
  };
  if (modifier === "Shielded garrison")
    foes.forEach((u) => {
      u.shield = u.maxHp * 0.25;
      applyStatus(u, "Shield", 3);
    });
  if (modifier === "Elite guard")
    foes.forEach((u) => {
      u.hp *= 1.25;
      u.maxHp = u.hp;
      u.atk *= 1.2;
    });
  if (modifier === "Reinforcements")
    b.units.push(makeEnemy(`e${region}-3`, level, 9));
  nextTurn(b);
  return b;
}
export function effectiveSpeed(u: Unit) {
  return u.speed * (has(u, "Haste") ? 1.4 : 1) * (has(u, "Slow") ? 0.6 : 1);
}
export function checkWinner(b: Battle) {
  if (!living(b, "enemy").length) b.winner = "hero";
  else if (!living(b, "hero").length) b.winner = "enemy";
  return b.winner;
}
const harmful: Status[] = [
  "Poison",
  "Burn",
  "Bleed",
  "Freeze",
  "Stun",
  "Slow",
  "Defense Down",
  "Attack Down",
  "Silence",
  "Curse",
  "Damage over Time",
];
export function applyStatus(u: Unit, name: Status, turns = 2) {
  if (u.boss && (name === "Stun" || name === "Freeze")) name = "Slow";
  if (u.hp <= 0 || (has(u, "Invulnerability") && harmful.includes(name)))
    return;
  const old = u.effects.find((e) => e.name === name);
  if (old) {
    old.turns = Math.max(old.turns, turns);
    old.stacks = Math.min(
      ["Poison", "Burn", "Bleed", "Damage over Time"].includes(name) ? 3 : 1,
      old.stacks + 1,
    );
    old.fresh = true;
  } else u.effects.push({ name, turns, stacks: 1, fresh: true });
}
function damageTo(b: Battle, u: Unit, amount: number, source?: Unit) {
  if (has(u, "Invulnerability")) return 0;
  let dmg = Math.max(1, Math.round(amount));
  const blocked = Math.min(u.shield, dmg);
  u.shield -= blocked;
  dmg -= blocked;
  const actual = Math.min(u.hp, dmg);
  u.hp = Math.max(0, u.hp - dmg);
  if (source && source.defId === "h11")
    source.hp = Math.min(source.maxHp, source.hp + actual * 0.25);
  return actual;
}
export function damage(b: Battle, actor: Unit, target: Unit, power: number) {
  const critical = rng(b) < actor.crit + (actor.defId === "h1" ? 0.15 : 0);
  if (target.defId === "h9" && rng(b) < 0.15)
    return { amount: 0, critical: false };
  const atk =
    actor.atk *
    (has(actor, "Attack Up") ? 1.35 : 1) *
    (has(actor, "Attack Down") ? 0.7 : 1) *
    ((actor.defId === "h8" || actor.defId === "h17") &&
    actor.hp < actor.maxHp / 2
      ? actor.defId === "h8"
        ? 1.3
        : 1.35
      : 1) *
    (actor.defId === "h19" ? 1 + Math.min(0.6, b.round * 0.12) : 1);
  const def =
    target.def *
    (has(target, "Defense Up") ? 1.5 : 1) *
    (has(target, "Defense Down") ? 0.6 : 1);
  let value =
    atk *
    power *
    (100 / (100 + def * 3)) *
    advantage(actor.element, target.element) *
    (critical ? 1.6 + (actor.defId === "h5" ? 0.2 : 0) : 1);
  if (target.defId === "h0") value *= 0.82;
  if (target.defId === "h7") value *= 0.85;
  if (has(target, "Curse")) value *= 1.25;
  if (
    (actor.defId === "h3" && has(target, "Burn")) ||
    (actor.defId === "h14" && has(target, "Poison"))
  )
    value *= 1.2;
  if (
    b.modifier === "Elemental surge" &&
    advantage(actor.element, target.element) > 1
  )
    value *= 1.3;
  value *= 1 - Math.min(0.5, target.resist?.[actor.element] ?? 0);
  return { amount: damageTo(b, target, value, actor), critical };
}
export function available(b: Battle, u: Unit, index: number) {
  return (
    index < 0 ||
    (!!u.abilities[index] &&
      u.cooldowns[index] <= 0 &&
      u.mana >= u.abilities[index].cost &&
      !has(u, "Silence"))
  );
}
export function targetsFor(b: Battle, u: Unit, a: Ability) {
  let list = living(
    b,
    a.target.includes("Enemies") || a.target === "enemy"
      ? u.side === "hero"
        ? "enemy"
        : "hero"
      : u.side,
  );
  if (a.target === "self") return [u];
  if (a.target === "enemy") {
    const taunters = list.filter((v) => has(v, "Taunt"));
    if (taunters.length) list = taunters;
  }
  return list;
}
export function act(b: Battle, index: number, targetId?: string): CombatEvent {
  if (b.winner || !b.current) throw Error("No active turn.");
  const u = b.units.find((u) => u.id === b.current)!;
  if (!available(b, u, index)) throw Error("Ability unavailable.");
  const a = index === -2 ? guard : index === -1 ? basic : u.abilities[index];
  let targets = targetsFor(b, u, a);
  if (a.target === "enemy" || a.target === "ally") {
    const target = targets.find((t) => t.id === targetId);
    if (!target) throw Error("Choose a valid target.");
    targets = [target];
  }
  const event: CombatEvent = {
    actor: u.id,
    targets: targets.map((t) => t.id),
    ability: a.name,
    type: a.summon ? "summon" : a.heal ? "heal" : a.power ? "attack" : "buff",
    results: [],
    element: u.element,
  };
  if (index >= 0) {
    u.mana -= a.cost;
    u.cooldowns[index] = a.cooldown + 1;
  } else u.mana = Math.min(10, u.mana + 2);
  for (const t of targets) {
    let value = 0,
      critical = false;
    if (a.heal) {
      value = Math.round(
        u.atk *
          a.power *
          2 *
          (has(t, "Curse") ? 0.65 : 1) *
          (b.modifier === "Diminished healing" ? 0.55 : 1),
      );
      value = Math.min(t.maxHp - t.hp, value);
      t.hp += value;
    } else if (a.power > 0) {
      for (let h = 0; h < (a.hits ?? 1); h++) {
        const result = damage(b, u, t, a.power);
        value += result.amount;
        critical ||= result.critical;
      }
      if (t.defId === "h11" && t.hp > 0) damageTo(b, u, t.atk * 0.2);
      if (u.defId === "h15" && critical) applyStatus(t, "Burn");
      if (has(t, "Freeze"))
        t.effects = t.effects.filter((e) => e.name !== "Freeze");
    }
    if (a.cleanse)
      t.effects = t.effects.filter((e) => !harmful.includes(e.name));
    if (a.status) applyStatus(t, a.status, a.duration);
    if (a.shield || a.status === "Shield") {
      t.shield = Math.min(t.maxHp * 0.7, t.shield + u.atk * 2);
      applyStatus(t, "Shield", 3);
    }
    if (t.hp <= 0 && u.defId === "h6") u.mana = Math.min(10, u.mana + 3);
    event.results.push({
      id: t.id,
      value,
      crit: critical,
      dead: t.hp <= 0,
      label: a.status,
    });
  }
  if (a.summon && living(b, u.side).length < 5) {
    const minion = makeEnemy(
      `e${Math.max(0, enemies.find((e) => e.id === u.defId)?.region ?? 2)}-0`,
      u.level,
      100 + b.serial++,
    );
    minion.id = `summon${b.serial}`;
    if (u.defId === "h12") {
      minion.name = "Clockwork turret";
      minion.look = "turret";
    } else if (
      u.defId === "h6" ||
      enemies.find((e) => e.id === u.defId)?.region === 2
    ) {
      minion.name = "Bound skeleton";
      minion.look = "skeleton";
    } else minion.name = `${minion.name} reinforcement`;
    minion.side = u.side;
    minion.summoned = true;
    minion.maxHp = minion.hp = u.maxHp * 0.4;
    minion.atk = u.atk * 0.6;
    minion.abilities = [];
    b.units.push(minion);
    event.targets.push(minion.id);
  }
  b.log.unshift(
    `${u.name} used ${a.name}${event.results.some((r) => r.value > 0) ? ` · ${event.results.map((r) => `${r.value}${a.heal ? " healed" : " damage"}${r.crit ? " CRITICAL" : ""}`).join(", ")}` : ""}.`,
  );
  b.log = b.log.slice(0, 24);
  b.events.push(event);
  endEffects(u);
  checkWinner(b);
  b.current = null;
  return event;
}
function endEffects(u: Unit) {
  for (const e of u.effects) {
    if (e.fresh) e.fresh = false;
    else e.turns--;
  }
  u.effects = u.effects.filter((e) => e.turns > 0);
  if (!has(u, "Shield")) u.shield = 0;
}
function tick(b: Battle, u: Unit) {
  for (const e of u.effects) {
    let amount = 0;
    if (["Poison", "Burn", "Bleed", "Damage over Time"].includes(e.name)) {
      amount = damageTo(
        b,
        u,
        u.maxHp *
          (u.boss ? 0.015 : 0.045) *
          e.stacks *
          (e.name === "Poison" && b.modifier === "Toxic air" ? 1.75 : 1),
      );
    }
    if (e.name === "Regeneration") {
      amount = -Math.min(u.maxHp - u.hp, u.maxHp * 0.1);
      u.hp -= amount;
    }
    if (amount)
      b.events.push({
        actor: u.id,
        targets: [u.id],
        ability: e.name,
        type: "tick",
        element: u.element,
        results: [
          {
            id: u.id,
            value: amount,
            crit: false,
            dead: u.hp <= 0,
            label: e.name,
          },
        ],
      });
  }
}
export function nextTurn(b: Battle): Unit | null {
  if (checkWinner(b)) return null;
  for (let tries = 0; tries < 100; tries++) {
    if (!b.queue.length) {
      b.round++;
      b.queue = b.units
        .filter((u) => u.hp > 0)
        .sort(
          (a, c) =>
            effectiveSpeed(c) - effectiveSpeed(a) || a.id.localeCompare(c.id),
        )
        .map((u) => u.id);
      if (b.round > 70) {
        b.winner = "enemy";
        b.log.unshift("The dungeon overwhelms the party after 70 rounds.");
        return null;
      }
    }
    const id = b.queue.shift()!,
      u = b.units.find((u) => u.id === id)!;
    if (u.hp <= 0) continue;
    u.turns++;
    u.cooldowns = u.cooldowns.map((c) => Math.max(0, c - 1));
    u.mana = Math.min(10, u.mana + 1);
    tick(b, u);
    if (u.hp <= 0) {
      if (checkWinner(b)) return null;
      continue;
    }
    if (u.defId === "h2") u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.04);
    if (u.defId === "h4") {
      const ally = living(b, "hero").sort(
        (a, c) => a.hp / a.maxHp - c.hp / c.maxHp,
      )[0];
      ally.hp = Math.min(ally.maxHp, ally.hp + u.atk * 0.35);
    }
    if (u.defId === "h13")
      living(b, "hero").forEach(
        (a) => (a.hp = Math.min(a.maxHp, a.hp + a.maxHp * 0.03)),
      );
    if (u.defId === "h10")
      living(b, "hero").forEach((a) => (a.mana = Math.min(10, a.mana + 1)));
    if (u.defId === "h16") {
      u.shield = Math.min(u.maxHp * 0.3, u.shield + u.atk * 0.4);
      applyStatus(u, "Shield", 2);
    }
    if (u.defId === "h12") {
      const foe = living(b, "enemy")[0];
      if (foe) damageTo(b, foe, u.atk * 0.3);
    }
    if (u.boss && u.hp < u.maxHp * 0.5 && u.phase === 0) {
      u.phase = 1;
      u.atk *= 1.3;
      u.cooldowns = u.cooldowns.map(() => 0);
      applyStatus(u, "Haste", 4);
      const faction = enemies.find((e) => e.id === u.defId)?.region ?? 0;
      if (faction === 0) {
        u.shield += u.maxHp * 0.12;
        applyStatus(u, "Taunt", 3);
      }
      if (faction === 1) {
        u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.12);
        applyStatus(u, "Regeneration", 3);
      }
      if (faction === 2 && living(b, "enemy").length < 5) {
        const minion = makeEnemy("e2-0", u.level, 200 + b.serial++);
        minion.summoned = true;
        b.units.push(minion);
      }
      if (faction === 3)
        living(b, "hero").forEach((a) => applyStatus(a, "Slow", 2));
      if (faction === 4)
        living(b, "hero").forEach((a) => applyStatus(a, "Burn", 2));
      if (faction === 5)
        living(b, "hero").forEach((a) => applyStatus(a, "Curse", 2));
      b.log.unshift(
        `${u.name} enters phase II: +30% attack. ${u.abilities[0].name} is ready!`,
      );
    }
    if (u.renewal) u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.02);
    const skip = has(u, "Stun") || has(u, "Freeze");
    for (const e of u.effects) e.fresh = false;
    if (checkWinner(b)) return null;
    if (skip) {
      endEffects(u);
      b.log.unshift(`${u.name} cannot act: frozen or stunned.`);
      continue;
    }
    b.current = u.id;
    return u;
  }
  throw Error("Turn iteration exhausted.");
}
export function chooseAI(
  b: Battle,
  u: Unit,
): { index: number; targetId: string } {
  const foes = living(b, u.side === "hero" ? "enemy" : "hero");
  const allies = living(b, u.side);
  let best = { score: -Infinity, index: -1, targetId: foes[0]?.id ?? u.id };
  for (const index of [-1, ...u.abilities.map((_, i) => i)]) {
    if (!available(b, u, index)) continue;
    const a = index === -1 ? basic : u.abilities[index];
    for (const target of targetsFor(b, u, a)) {
      let score = 0;
      if (a.heal)
        score = Math.min(target.maxHp - target.hp, u.atk * a.power * 2) * 1.6;
      else if (a.summon) score = allies.length < 5 ? u.atk * 1.7 : 0;
      else if (a.power) {
        score =
          u.atk *
          a.power *
          (a.hits ?? 1) *
          advantage(u.element, target.element) *
          (a.target === "allEnemies" ? foes.length * 0.75 : 1);
        if (target.hp < u.atk * a.power * 1.1) score *= 1.5;
        if (a.status && !has(target, a.status)) score += u.atk * 0.4;
        if (a.status === "Stun" || a.status === "Freeze") score += u.atk * 0.35;
      } else
        score =
          (a.status && !has(target, a.status) ? u.atk * 0.8 : 0) +
          (a.shield && target.shield < u.atk ? u.atk * 0.7 : 0);
      if (score > best.score) best = { score, index, targetId: target.id };
    }
  }
  return { index: best.index, targetId: best.targetId };
}
export function autoStep(b: Battle) {
  if (!b.current) nextTurn(b);
  if (b.winner) return;
  const u = b.units.find((u) => u.id === b.current)!;
  const a = chooseAI(b, u);
  act(b, a.index, a.targetId);
  nextTurn(b);
}
