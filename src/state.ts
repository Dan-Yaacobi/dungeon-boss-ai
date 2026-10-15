import { heroes, items, quests, achievements, type ItemDef } from "./content";
export interface HeroSave {
  level: number;
  xp: number;
  stars: number;
  ascension: number;
  shards: number;
  unlocked: boolean;
  abilities: number[];
  equipment: Partial<Record<ItemDef["slot"], string>>;
}
export interface Gear {
  uid: string;
  id: string;
  level: number;
}
export interface Save {
  version: 1;
  name: string;
  heroes: Record<string, HeroSave>;
  party: string[];
  gold: number;
  gems: number;
  materials: number;
  ore: number;
  inventory: Gear[];
  campaign: number;
  clears: number[];
  raidWins: number[];
  claimed: string[];
  metrics: Record<string, number>;
  settings: { music: number; sfx: number; speed: number; shadows: boolean };
  tutorial: boolean;
  serial: number;
}
export const SAVE_KEY = "dungeon-realms-v1";
export function freshSave(): Save {
  return {
    version: 1,
    name: "The Wayfarer",
    heroes: Object.fromEntries(
      heroes.map((h, i) => [
        h.id,
        {
          level: 1,
          xp: 0,
          stars: 1,
          ascension: 0,
          shards: i < 4 ? 0 : 5,
          unlocked: i < 4,
          abilities: [1, 1, 1],
          equipment: {},
        },
      ]),
    ),
    party: ["h0", "h1", "h2", "h3"],
    gold: 750,
    gems: 180,
    materials: 25,
    ore: 20,
    inventory: [
      { uid: "g0", id: "item0", level: 1 },
      { uid: "g1", id: "item4", level: 1 },
      { uid: "g2", id: "item8", level: 1 },
    ],
    campaign: 0,
    clears: [],
    raidWins: [],
    claimed: [],
    metrics: {
      battles: 0,
      dungeons: 0,
      raids: 0,
      upgrades: 0,
      recruits: 4,
      chests: 0,
      campaign: 0,
    },
    settings: { music: 0.25, sfx: 0.5, speed: 1, shadows: true },
    tutorial: true,
    serial: 3,
  };
}
const finite = (x: unknown, min = 0, max = 1e9): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
export function validateSave(raw: unknown): Save {
  if (!raw || typeof raw !== "object") throw Error("Invalid save file.");
  const s = raw as Save;
  if (s.version !== 1) throw Error("Unsupported save version.");
  for (const key of [
    "gold",
    "gems",
    "materials",
    "ore",
    "campaign",
    "serial",
  ] as const)
    if (!finite(s[key])) throw Error(`Invalid ${key}.`);
  if (
    !s.metrics ||
    [
      "battles",
      "dungeons",
      "raids",
      "upgrades",
      "recruits",
      "chests",
      "campaign",
    ].some((k) => !finite(s.metrics[k]))
  )
    throw Error("Missing progress metrics.");
  if (
    !Array.isArray(s.party) ||
    s.party.length < 1 ||
    s.party.length > 4 ||
    new Set(s.party).size !== s.party.length
  )
    throw Error("Invalid party.");
  for (const h of heroes) {
    const v = s.heroes?.[h.id];
    if (
      !v ||
      !finite(v.level, 1, 60) ||
      !finite(v.stars, 1, 6) ||
      !finite(v.ascension, 0, 5) ||
      !finite(v.xp) ||
      !finite(v.shards) ||
      typeof v.unlocked !== "boolean" ||
      !Array.isArray(v.abilities) ||
      v.abilities.length !== 3 ||
      v.abilities.some((x) => !finite(x, 1, 10)) ||
      !v.equipment
    )
      throw Error("Invalid hero.");
  }
  if (s.party.some((id) => !s.heroes[id]?.unlocked))
    throw Error("Locked party member.");
  if (
    !Array.isArray(s.inventory) ||
    s.inventory.some(
      (g) =>
        !g ||
        !items.some((i) => i.id === g.id) ||
        typeof g.uid !== "string" ||
        !finite(g.level, 1, 20),
    ) ||
    new Set(s.inventory.map((g) => g.uid)).size !== s.inventory.length
  )
    throw Error("Invalid inventory.");
  for (const h of Object.values(s.heroes))
    for (const [slot, uid] of Object.entries(h.equipment)) {
      const g = s.inventory.find((g) => g.uid === uid);
      if (!g || items.find((i) => i.id === g.id)?.slot !== slot)
        throw Error("Invalid equipped item.");
    }
  for (const key of ["clears", "raidWins"] as const)
    if (
      !Array.isArray(s[key]) ||
      s[key].some(
        (x) =>
          !Number.isInteger(x) || x < 0 || x >= (key === "clears" ? 30 : 12),
      )
    )
      throw Error("Invalid progress.");
  const equipped = Object.values(s.heroes).flatMap((h) =>
    Object.values(h.equipment),
  );
  if (new Set(equipped).size !== equipped.length)
    throw Error("Equipment cannot be duplicated.");
  if (
    s.campaign > 30 ||
    !Array.isArray(s.claimed) ||
    s.claimed.some(
      (x) => ![...quests, ...achievements].some((q) => q.id === x),
    ) ||
    !s.metrics ||
    Object.values(s.metrics).some((x) => !finite(x)) ||
    !s.settings ||
    !finite(s.settings.music, 0, 1) ||
    !finite(s.settings.sfx, 0, 1) ||
    !finite(s.settings.speed, 1, 3) ||
    typeof s.settings.shadows !== "boolean"
  )
    throw Error("Invalid settings or progress.");
  return structuredClone(s);
}
export function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? validateSave(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
export function persist(s: Save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
}
export function stats(s: Save, id: string) {
  const h = heroes.find((h) => h.id === id)!;
  const p = s.heroes[id];
  const mult = 1 + (p.stars - 1) * 0.12 + p.ascension * 0.15;
  const out = {
    hp: Math.round((h.hp + (p.level - 1) * h.growth.hp) * mult),
    atk: Math.round((h.atk + (p.level - 1) * h.growth.atk) * mult),
    def: Math.round((h.def + (p.level - 1) * h.growth.def) * mult),
    speed: h.speed,
    crit: 0.12,
  };
  for (const uid of Object.values(p.equipment)) {
    const g = s.inventory.find((g) => g.uid === uid);
    if (!g) continue;
    const item = items.find((i) => i.id === g.id)!;
    for (const k of ["hp", "atk", "def", "speed", "crit"] as const)
      out[k] += item[k] * (1 + (g.level - 1) * 0.15);
  }
  return out;
}
export function addXP(s: Save, id: string, amount: number) {
  const h = s.heroes[id];
  h.xp += amount;
  while (h.level < 60 && h.xp >= h.level * 70) {
    h.xp -= h.level * 70;
    h.level++;
  }
}
export function train(s: Save, id: string) {
  const h = s.heroes[id],
    cost = h.level * 45;
  if (h.level >= 60) throw Error("Maximum level reached.");
  if (s.gold < cost) throw Error(`Training requires ${cost} gold.`);
  s.gold -= cost;
  addXP(s, id, h.level * 70);
  s.metrics.upgrades++;
}
export function recruit(s: Save, id: string) {
  const h = s.heroes[id];
  if (h.unlocked) throw Error("Already recruited.");
  if (h.shards < 10) throw Error("Recruitment requires 10 shards.");
  h.shards -= 10;
  h.unlocked = true;
  s.metrics.recruits++;
}
export function rankUp(s: Save, id: string) {
  const h = s.heroes[id],
    cost = h.stars * 10;
  if (h.stars >= 6) throw Error("Maximum stars reached.");
  if (h.shards < cost || s.gold < cost * 15)
    throw Error(`Requires ${cost} shards and ${cost * 15} gold.`);
  h.shards -= cost;
  s.gold -= cost * 15;
  h.stars++;
  s.metrics.upgrades++;
}
export function ascend(s: Save, id: string) {
  const h = s.heroes[id],
    cost = 10 * (h.ascension + 1);
  if (h.ascension >= 5) throw Error("Fully ascended.");
  if (
    h.level < (h.ascension + 1) * 5 ||
    s.materials < cost ||
    s.gold < cost * 20
  )
    throw Error(
      `Requires level ${(h.ascension + 1) * 5}, ${cost} materials and ${cost * 20} gold.`,
    );
  s.materials -= cost;
  s.gold -= cost * 20;
  h.ascension++;
  s.metrics.upgrades++;
}
export function upgradeAbility(s: Save, id: string, index: number) {
  const h = s.heroes[id],
    cost = h.abilities[index] * 3;
  if (h.level < [1, 3, 5][index]) throw Error("Ability still locked.");
  if (h.abilities[index] >= 10 || s.materials < cost || s.gold < cost * 20)
    throw Error(`Requires ${cost} materials and ${cost * 20} gold.`);
  s.materials -= cost;
  s.gold -= cost * 20;
  h.abilities[index]++;
  s.metrics.upgrades++;
}
export function addGear(s: Save, id: string) {
  const g = { uid: `g${s.serial++}`, id, level: 1 };
  s.inventory.push(g);
  return g;
}
export function equip(s: Save, id: string, uid: string) {
  const g = s.inventory.find((g) => g.uid === uid);
  if (!g || !s.heroes[id].unlocked) throw Error("Cannot equip.");
  for (const h of Object.values(s.heroes))
    for (const slot of Object.keys(h.equipment) as ItemDef["slot"][])
      if (h.equipment[slot] === uid) delete h.equipment[slot];
  const item = items.find((i) => i.id === g.id)!;
  s.heroes[id].equipment[item.slot] = uid;
}
export function enhance(s: Save, uid: string) {
  const g = s.inventory.find((g) => g.uid === uid)!;
  if (!g || g.level >= 20) throw Error("Cannot enhance.");
  if (s.ore < g.level * 2 || s.gold < g.level * 60)
    throw Error(`Requires ${g.level * 2} ore and ${g.level * 60} gold.`);
  s.ore -= g.level * 2;
  s.gold -= g.level * 60;
  g.level++;
  s.metrics.upgrades++;
}
export function sell(s: Save, uid: string) {
  if (
    Object.values(s.heroes).some((h) =>
      Object.values(h.equipment).includes(uid),
    )
  )
    throw Error("Unequip before selling.");
  const g = s.inventory.find((g) => g.uid === uid);
  if (!g) throw Error("Item missing.");
  s.gold += 40 * (1 + Math.floor(Number(g.id.slice(4)) / 12)) * g.level;
  s.inventory = s.inventory.filter((g) => g.uid !== uid);
}
export function claim(s: Save, id: string) {
  const q = [...quests, ...achievements].find((q) => q.id === id);
  if (!q || s.claimed.includes(id) || (s.metrics[q.metric] ?? 0) < q.goal)
    throw Error("Objective not complete.");
  s.claimed.push(id);
  s.gold += q.gold;
  s.gems += q.gems;
}
export interface Reward {
  gold: number;
  gems: number;
  xp: number;
  materials: number;
  ore: number;
  shards: { id: string; count: number }[];
  item: string;
  first: boolean;
}
export function grantReward(
  s: Save,
  id: number,
  raid = false,
  difficulty = 0,
): Reward {
  const first = !(raid ? s.raidWins : s.clears).includes(id),
    tier = raid
      ? Math.min(5, Math.floor(id / 2) + difficulty)
      : Math.floor(id / 5);
  const reward = {
    gold: (150 + id * 25) * (1 + difficulty * 0.6) + (first ? 200 : 0),
    gems: first ? 30 : 5,
    xp: 90 + id * 24,
    materials: 4 + tier * 2 + difficulty * 3,
    ore: 4 + tier * 2,
    shards: [
      { id: `h${(id + 4) % 20}`, count: first ? 10 : 5 },
      { id: `h${(id + 9) % 20}`, count: 5 },
    ],
    item: `item${Math.min(59, Math.min(4, Math.floor(tier / 1.5)) * 12 + (s.serial % 12))}`,
    first,
  };
  s.gold += reward.gold;
  s.gems += reward.gems;
  s.materials += reward.materials;
  s.ore += reward.ore;
  for (const p of s.party) addXP(s, p, reward.xp);
  for (const x of reward.shards) s.heroes[x.id].shards += x.count;
  addGear(s, reward.item);
  if (raid) {
    s.metrics.raids++;
    if (first) s.raidWins.push(id);
  } else {
    s.metrics.dungeons++;
    if (first) s.clears.push(id);
    s.campaign = Math.max(s.campaign, id + 1);
    s.metrics.campaign = s.campaign;
  }
  return reward;
}
export function summon(s: Save, id: string) {
  if (s.gems < 35) throw Error("Requires 35 gems.");
  s.gems -= 35;
  s.heroes[id].shards += 5;
}
export function craft(s: Save, tier: number, slot: number) {
  const cost = 8 + tier * 6;
  if (s.ore < cost || s.gold < cost * 25)
    throw Error(`Requires ${cost} ore and ${cost * 25} gold.`);
  s.ore -= cost;
  s.gold -= cost * 25;
  const item = addGear(s, `item${tier * 12 + slot * 4 + (s.serial % 4)}`);
  s.metrics.upgrades++;
  return item;
}
