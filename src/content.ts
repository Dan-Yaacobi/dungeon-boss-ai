export const elements = [
  "Light",
  "Dark",
  "Earth",
  "Fire",
  "Nature",
  "Lightning",
  "Water",
  "Air",
] as const;
export type Element = (typeof elements)[number];
export const colors: Record<Element, string> = {
  Light: "#ffe6a0",
  Dark: "#bd87ff",
  Earth: "#e7b76c",
  Fire: "#ff8050",
  Nature: "#8fe89a",
  Lightning: "#ffe966",
  Water: "#73d8ff",
  Air: "#bbf2ef",
};
export type Status =
  | "Poison"
  | "Burn"
  | "Bleed"
  | "Freeze"
  | "Stun"
  | "Slow"
  | "Haste"
  | "Shield"
  | "Regeneration"
  | "Defense Up"
  | "Defense Down"
  | "Attack Up"
  | "Attack Down"
  | "Taunt"
  | "Silence"
  | "Curse"
  | "Invulnerability"
  | "Damage over Time";
export type Target = "enemy" | "allEnemies" | "ally" | "allAllies" | "self";
export interface Ability {
  name: string;
  description: string;
  power: number;
  target: Target;
  cooldown: number;
  cost: number;
  status?: Status;
  duration?: number;
  heal?: boolean;
  summon?: boolean;
  hits?: number;
  cleanse?: boolean;
  shield?: boolean;
}
const skill = (
  name: string,
  target: Target,
  power: number,
  status?: Status,
  extra: Partial<Ability> = {},
): Ability => ({
  name,
  target,
  power,
  status,
  cooldown: 3,
  cost: 2,
  duration: 2,
  description: `${target === "allEnemies" ? "All enemies" : target === "allAllies" ? "All allies" : target === "self" ? "Self" : target === "ally" ? "One ally" : "One enemy"}: ${power ? `${Math.round(power * 100)}% ${extra.heal ? "healing" : "power"}. ` : ""}${status ? `${status} for 2 turns. ` : ""}${extra.summon ? "Summon a skeleton ally. " : ""}${extra.cleanse ? "Remove harmful effects. " : ""}`,
  ...extra,
});
export interface HeroDef {
  id: string;
  name: string;
  element: Element;
  role: string;
  rarity: string;
  description: string;
  hp: number;
  atk: number;
  def: number;
  speed: number;
  growth: { hp: number; atk: number; def: number };
  abilities: Ability[];
  passive: string;
  look: string;
  unlock: string;
}
const rows: [
  string,
  Element,
  string,
  string,
  string,
  string,
  string,
  Ability[],
][] = [
  [
    "Aldric Ironshield",
    "Light",
    "Tank",
    "Rare",
    "A steadfast captain who carries the last sun-forged shield.",
    "knight",
    "Bulwark: takes 18% less damage.",
    [
      skill("Stand Behind Me", "self", 0, "Taunt", { shield: true }),
      skill("Sunsteel Bash", "enemy", 1.5, "Stun"),
      skill("Dawn Aegis", "allAllies", 0, "Defense Up", { shield: true }),
    ],
  ],
  [
    "Nyra Shadowfang",
    "Dark",
    "Assassin",
    "Epic",
    "A masked duelist hunting the cult that stole her shadow.",
    "rogue",
    "Assassin: +15% critical chance.",
    [
      skill("Venom Kiss", "enemy", 1.2, "Poison"),
      skill("Shadow Flurry", "enemy", 0.7, "Bleed", { hits: 3 }),
      skill("Nightfall", "allEnemies", 1.6, "Silence"),
    ],
  ],
  [
    "Brakka Stonefist",
    "Earth",
    "Bruiser",
    "Rare",
    "A mountain-born pugilist with fists of living granite.",
    "brute",
    "Stone skin: heals 4% health each turn.",
    [
      skill("Fault Line", "enemy", 1.4, "Defense Down"),
      skill("Boulder Toss", "enemy", 1.6, "Stun"),
      skill("Earthquake", "allEnemies", 1.8, "Slow"),
    ],
  ],
  [
    "Ember Vex",
    "Fire",
    "Mage",
    "Rare",
    "A flame-haired academy exile with a spectacular temper.",
    "mage",
    "Kindling: +20% damage against burning targets.",
    [
      skill("Cinderbolt", "enemy", 1.5, "Burn"),
      skill("Flame Circle", "allEnemies", 1.1, "Burn"),
      skill("Phoenix Wake", "allEnemies", 2.1, "Attack Down"),
    ],
  ],
  [
    "Sylwen Thorn",
    "Nature",
    "Healer",
    "Rare",
    "The grove’s gentle keeper fights with thorn and blossom.",
    "druid",
    "Verdant pulse: heals the weakest ally each turn.",
    [
      skill("Mending Blossom", "ally", 1.7, "Regeneration", { heal: true }),
      skill("Briar Embrace", "enemy", 1.3, "Slow"),
      skill("Spring Eternal", "allAllies", 1.5, "Regeneration", {
        heal: true,
        cleanse: true,
      }),
    ],
  ],
  [
    "Kael Stormbow",
    "Lightning",
    "Archer",
    "Epic",
    "A sky ranger whose arrows sing with captured thunder.",
    "archer",
    "Deadeye: +20% critical damage.",
    [
      skill("Storm Arrow", "enemy", 1.8, "Stun"),
      skill("Chain Lightning", "allEnemies", 1.3, "Slow"),
      skill("Eagle Eye", "self", 0, "Attack Up", { cost: 1 }),
    ],
  ],
  [
    "Morgrim Bonecaller",
    "Dark",
    "Necromancer",
    "Epic",
    "A courteous scholar followed by very impolite skeletons.",
    "necromancer",
    "Soul harvest: restores 3 mana on a kill.",
    [
      skill("Raise Bones", "self", 0, undefined, { summon: true }),
      skill("Grave Chill", "allEnemies", 1.1, "Curse"),
      skill("Soul Siphon", "enemy", 2.1, "Damage over Time"),
    ],
  ],
  [
    "Thalia Frostveil",
    "Water",
    "Control Mage",
    "Epic",
    "A glacier oracle who speaks in snow and silence.",
    "mage",
    "Cold heart: 15% reduced incoming damage.",
    [
      skill("Winter Needle", "enemy", 1.4, "Freeze"),
      skill("Whiteout", "allEnemies", 1.2, "Slow"),
      skill("Glacial Prison", "allEnemies", 1.5, "Freeze"),
    ],
  ],
  [
    "Rurik Flamebeard",
    "Fire",
    "Warrior",
    "Rare",
    "A dwarven veteran whose beard smolders after every victory.",
    "dwarf",
    "Rage: +30% attack below half health.",
    [
      skill("Cleave", "allEnemies", 1.2, "Bleed"),
      skill("War Cry", "self", 0, "Attack Up"),
      skill("Anvil Breaker", "enemy", 2.5, "Defense Down"),
    ],
  ],
  [
    "Zephyr Quickstep",
    "Air",
    "Rogue",
    "Epic",
    "A smiling sky thief who is never where the blade lands.",
    "rogue",
    "Windstep: 15% evasion.",
    [
      skill("Gale Knives", "enemy", 0.7, undefined, { hits: 3 }),
      skill("Tailwind", "allAllies", 0, "Haste"),
      skill("Vanish", "self", 0, "Invulnerability"),
    ],
  ],
  [
    "Orla Moonwhisper",
    "Light",
    "Support",
    "Epic",
    "The moon temple’s singer turns melodies into protective light.",
    "priest",
    "Moonlight: allies regain 1 extra mana on her turn.",
    [
      skill("Silver Hymn", "allAllies", 0, "Attack Up"),
      skill("Purifying Note", "allAllies", 0.7, undefined, {
        heal: true,
        cleanse: true,
      }),
      skill("Moon Sanctuary", "allAllies", 0, "Invulnerability", {
        cooldown: 5,
      }),
    ],
  ],
  [
    "Drogath the Devourer",
    "Dark",
    "Monster Tank",
    "Legendary",
    "A reformed abyss beast with an unreformed appetite.",
    "monster",
    "Devour: heals 25% of damage dealt; retaliates when hit.",
    [
      skill("Feast", "enemy", 1.9, "Curse"),
      skill("Challenge Roar", "self", 0, "Taunt", { shield: true }),
      skill("Abyss Maw", "allEnemies", 1.8, "Attack Down"),
    ],
  ],
  [
    "Fenwick Gearsmith",
    "Earth",
    "Engineer",
    "Rare",
    "A tiny inventor with a very large bag of unsafe ideas.",
    "engineer",
    "Clockwork turret: automatic shot at turn start.",
    [
      skill("Clockwork Sentry", "self", 0, undefined, { summon: true }),
      skill("Shrapnel Bomb", "allEnemies", 1.3, "Bleed"),
      skill("Overclock", "allAllies", 0, "Haste"),
    ],
  ],
  [
    "Seraphine Dawn",
    "Light",
    "Paladin",
    "Legendary",
    "A winged oathkeeper restoring hope to the fallen realms.",
    "angel",
    "Radiance: heals allies for 3% max HP each turn.",
    [
      skill("Mercy", "ally", 2, undefined, { heal: true, cleanse: true }),
      skill("Judgment", "enemy", 2, "Silence"),
      skill("Consecration", "allAllies", 0.9, "Defense Up", { heal: true }),
    ],
  ],
  [
    "Voss the Plagueborn",
    "Nature",
    "Debuffer",
    "Epic",
    "A wandering alchemist turning his own curse against evil.",
    "plague",
    "Contagion: +25% damage to poisoned targets.",
    [
      skill("Virulent Flask", "allEnemies", 0.9, "Poison"),
      skill("Withering Touch", "enemy", 1.4, "Attack Down"),
      skill("Pandemic", "allEnemies", 1.8, "Damage over Time"),
    ],
  ],
  [
    "Ignis Ashborn",
    "Fire",
    "Sorcerer",
    "Legendary",
    "A living ember wrapped in the robes of a lost king.",
    "firelord",
    "Volatile: critical hits burn the victim.",
    [
      skill("Fireball", "allEnemies", 1.3, "Burn"),
      skill("Combust", "enemy", 2.4, "Defense Down"),
      skill("Supernova", "allEnemies", 2.6, "Burn", { cost: 4, cooldown: 5 }),
    ],
  ],
  [
    "Mira Tidecaller",
    "Water",
    "Support Mage",
    "Rare",
    "A pearl-crowned navigator who commands the healing tide.",
    "mermaid",
    "Tidal flow: gains a small shield each turn.",
    [
      skill("Pearl Barrier", "allAllies", 0, "Shield", { shield: true }),
      skill("Renewing Tide", "allAllies", 1.2, undefined, { heal: true }),
      skill("Undertow", "allEnemies", 1.6, "Slow"),
    ],
  ],
  [
    "Garruk Wildclaw",
    "Nature",
    "Berserker",
    "Epic",
    "A lionhearted guardian whose claws answer every trespass.",
    "beast",
    "Blood frenzy: +35% damage below half health.",
    [
      skill("Rend", "enemy", 1.6, "Bleed"),
      skill("Primal Fury", "self", 0, "Attack Up"),
      skill("Savage Pounce", "enemy", 0.9, "Bleed", { hits: 3 }),
    ],
  ],
  [
    "Xareth Voidwalker",
    "Dark",
    "Warlock",
    "Legendary",
    "An exile from tomorrow trying to prevent the end of today.",
    "warlock",
    "Void pact: cursed enemies take 25% more damage.",
    [
      skill("Doom Mark", "enemy", 1.2, "Curse"),
      skill("Null Field", "allEnemies", 1.1, "Silence"),
      skill("Event Horizon", "allEnemies", 2, "Damage over Time"),
    ],
  ],
  [
    "Astrid Thunderheart",
    "Lightning",
    "Fighter",
    "Legendary",
    "A storm-chosen champion wielding twin thunder hammers.",
    "viking",
    "Momentum: +12% damage per round, up to 60%.",
    [
      skill("Thunder Punch", "enemy", 1.5, "Stun"),
      skill("Storm Combo", "enemy", 0.8, undefined, { hits: 3 }),
      skill("Tempest", "allEnemies", 1.9, "Stun"),
    ],
  ],
];
export const heroes: HeroDef[] = rows.map((r, i) => ({
  id: `h${i}`,
  name: r[0],
  element: r[1],
  role: r[2],
  rarity: r[3],
  description: r[4],
  look: r[5],
  passive: r[6],
  abilities: r[7],
  hp: /Tank|Bruiser|Warrior|Paladin|Berserker|Fighter/.test(r[2]) ? 160 : 115,
  atk: /Mage|Assassin|Archer|Sorcerer|Warlock/.test(r[2]) ? 30 : 24,
  def: /Tank|Paladin/.test(r[2]) ? 18 : 10,
  speed: [
    12, 19, 9, 13, 11, 17, 10, 12, 10, 22, 14, 8, 13, 12, 14, 11, 14, 16, 12,
    18,
  ][i],
  growth: { hp: 18 + (i % 4) * 2, atk: 3 + (i % 3), def: 1.5 },
  unlock:
    i < 4
      ? "Starting hero"
      : `Collect 10 shards from the Portal, quests, or ${["Warrens", "Woods", "Crypt", "Citadel", "Depths", "Void"][i % 6]} rewards.`,
}));
export const basic: Ability = {
  name: "Basic attack",
  description: "Strike one enemy. Restores 2 focus.",
  power: 1,
  target: "enemy",
  cooldown: 0,
  cost: 0,
};
export const guard: Ability = {
  name: "Guard",
  description: "Defend, gain a shield and restore 2 focus.",
  power: 0,
  target: "self",
  cooldown: 0,
  cost: 0,
  status: "Defense Up",
  duration: 2,
  shield: true,
};
export interface Region {
  name: string;
  subtitle: string;
  color: string;
  floor: string;
  boss: string;
}
export const regions: Region[] = [
  {
    name: "Goblin Warrens",
    subtitle: "Beneath the broken watchtower",
    color: "#ddaa5d",
    floor: "#726454",
    boss: "Grubnax, the Gilded King",
  },
  {
    name: "Whispering Woods",
    subtitle: "Where the old roots remember",
    color: "#75c68e",
    floor: "#375b4b",
    boss: "Elder Thornheart",
  },
  {
    name: "Crypt of the Fallen",
    subtitle: "A kingdom that would not die",
    color: "#b19bd9",
    floor: "#545064",
    boss: "Vespera, the Lich Queen",
  },
  {
    name: "Frozen Citadel",
    subtitle: "Beyond the last winter",
    color: "#81d8ef",
    floor: "#628895",
    boss: "The Frost Colossus",
  },
  {
    name: "Infernal Depths",
    subtitle: "At the heart of the mountain",
    color: "#fb9568",
    floor: "#6a4143",
    boss: "Malgrath, Flame Tyrant",
  },
  {
    name: "The Void Throne",
    subtitle: "The crown awaits its last king",
    color: "#ca9fff",
    floor: "#494062",
    boss: "The Hollow Sovereign",
  },
];
export const enemyNames = [
  [
    "Goblin Cutter",
    "Goblin Deadeye",
    "Goblin Hexer",
    "Goblin Bulwark",
    "Goblin Bombardier",
  ],
  [
    "Briar Wolf",
    "Venom Weaver",
    "Rotwood Guardian",
    "Spore Witch",
    "Feral Sprite",
  ],
  [
    "Skeleton Knight",
    "Bone Archer",
    "Grave Acolyte",
    "Zombie Brute",
    "Crypt Summoner",
  ],
  [
    "Ice Sentinel",
    "Frost Witch",
    "Snow Stalker",
    "Glacier Shaman",
    "Rime Drake",
  ],
  ["Fire Imp", "Infernal Knight", "Ash Priest", "Lava Hound", "Ember Fiend"],
  [
    "Void Cultist",
    "Rift Stalker",
    "Astral Construct",
    "Void Priest",
    "Abyss Watcher",
  ],
];
export interface EnemyDef {
  id: string;
  name: string;
  element: Element;
  role: string;
  look: string;
  region: number;
  boss: boolean;
  abilities: Ability[];
}
export const enemies: EnemyDef[] = regions.flatMap((r, region) => [
  ...enemyNames[region].map((name, j) => ({
    id: `e${region}-${j}`,
    name,
    element: (
      ["Earth", "Nature", "Dark", "Water", "Fire", "Dark"] as Element[]
    )[region],
    role: ["Aggressive", "Control", "Healer", "Tank", "Summoner"][j],
    look: [
      ["rogue", "archer", "mage", "knight", "engineer"],
      ["beast", "spider", "treant", "plague", "druid"],
      ["knight", "archer", "necromancer", "brute", "lich"],
      ["knight", "mage", "rogue", "priest", "demon"],
      ["demon", "knight", "priest", "beast", "firelord"],
      ["warlock", "rogue", "golem", "priest", "sovereign"],
    ][region][j],
    region,
    boss: false,
    abilities: [
      skill(
        [
          "Crushing Blow",
          "Binding Hex",
          "Restoration",
          "Iron Resolve",
          "Call Reinforcements",
        ][j],
        (["enemy", "allEnemies", "ally", "self", "self"] as Target[])[j],
        j === 3 || j === 4 ? 0 : 1.2,
        (
          ["Defense Down", "Slow", undefined, "Taunt", undefined] as (
            Status | undefined
          )[]
        )[j],
        { heal: j === 2, summon: j === 4, shield: j === 3 },
      ),
      skill("Faction Assault", "allEnemies", 0.8, "Attack Down"),
    ],
  })),
  {
    id: `boss${region}`,
    name: r.boss,
    element: (
      ["Earth", "Nature", "Dark", "Water", "Fire", "Dark"] as Element[]
    )[region],
    role: "Boss",
    look: ["king", "treant", "lich", "golem", "demon", "sovereign"][region],
    region,
    boss: true,
    abilities: [
      skill(
        [
          "Gilded Decree",
          "Verdant Rupture",
          "Soul Requiem",
          "Absolute Zero",
          "Rain of Cinders",
          "Unmake",
        ][region],
        "allEnemies",
        1.3,
        ["Stun", "Poison", "Curse", "Freeze", "Burn", "Silence"][
          region
        ] as Status,
        { cooldown: 4, cost: 0 },
      ),
      skill("Royal Guard", "self", 0, "Defense Up", { shield: true, cost: 0 }),
      skill("Oblivion", "enemy", 2, "Defense Down", { cost: 0 }),
    ],
  },
]);
export const stages = regions.flatMap((r, region) =>
  Array.from({ length: 5 }, (_, j) => ({
    id: region * 5 + j,
    region,
    index: j,
    name: [
      [
        "The Broken Gate",
        "Candlelit Tunnels",
        "The Rusted Vault",
        "King’s Approach",
        "A Crown of Scrap",
      ],
      [
        "Foxglove Path",
        "Webbed Hollow",
        "Rootbound Shrine",
        "The Lost Grove",
        "Heart of the Forest",
      ],
      [
        "Silent Steps",
        "Ossuary Hall",
        "Chamber of Echoes",
        "The Mourning Vault",
        "Queen of Ashes",
      ],
      [
        "The White Road",
        "Shivering Halls",
        "Glass Labyrinth",
        "The Winter Gate",
        "A Giant Awakens",
      ],
      [
        "Cinderfall",
        "The Iron Bridge",
        "Furnace of Souls",
        "Warlord’s Ascent",
        "Beneath the Volcano",
      ],
      [
        "Fractured Skies",
        "A World Unmade",
        "The Last Sanctuary",
        "The Hollow Court",
        "The Shattered Crown",
      ],
    ][region][j],
    level: 1 + region * 5 + j,
    boss: j === 4,
    rooms: ["battle", "treasure", "battle", "healing", "boss"] as const,
  })),
);
export const modifiers = [
  "Shielded garrison",
  "Toxic air",
  "Diminished healing",
  "Reinforcements",
  "Elemental surge",
  "Elite guard",
];
export const raids = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  region: Math.floor(i / 2),
  name: [
    "Copperfang Outpost",
    "The Gilded Bastion",
    "Briarwatch",
    "Sporefang Nest",
    "Mourning Keep",
    "Bone King’s Refuge",
    "Rimewatch Tower",
    "The Glass Fortress",
    "Ashen Rampart",
    "The Crucible",
    "The Broken Observatory",
    "Citadel of Nothing",
  ][i],
  level: 2 + i * 2,
  modifier: modifiers[i % 6],
  waves: 3 + (i % 2),
}));
export const commanders: EnemyDef[] = raids.map((r, i) => {
  const boss = enemies.find((e) => e.id === `boss${r.region}`)!;
  return {
    ...boss,
    id: `commander${i}`,
    name: [
      "Captain Copperfang",
      "Duke Goldtooth",
      "Warden Briarhorn",
      "Matron Sporeveil",
      "Marshal Graveward",
      "Baron Ossifex",
      "Keeper Rimehart",
      "Lady Glasswinter",
      "General Ashmaw",
      "The Crucible Keeper",
      "Oracle Nullstar",
      "Regent of Nothing",
    ][i],
    abilities: boss.abilities.map((a, j) => ({
      ...a,
      name:
        j === 0
          ? `${["Copperfang", "Goldtooth", "Briarhorn", "Sporeveil", "Graveward", "Ossifex", "Rimehart", "Glasswinter", "Ashmaw", "Crucible", "Nullstar", "Hollow"][i]}'s decree`
          : a.name,
    })),
  };
});
enemies.push(...commanders);
export interface ItemDef {
  id: string;
  name: string;
  slot: "Weapon" | "Armor" | "Accessory";
  rarity: string;
  atk: number;
  hp: number;
  def: number;
  speed: number;
  crit: number;
  resistance: Element;
  bonus: string;
}
export const rarities = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
export const items: ItemDef[] = Array.from({ length: 60 }, (_, i) => ({
  id: `item${i}`,
  name: `${["Traveler’s", "Grovebound", "Runic", "Sovereign’s", "Celestial"][Math.floor(i / 12)]} ${["Longsword", "Warhammer", "Stormbow", "Wand", "Breastplate", "Mantle", "Bulwark", "Cuirass", "Signet", "Talisman", "Moonstone", "Crown"][i % 12]}`,
  slot: i % 12 < 4 ? "Weapon" : i % 12 < 8 ? "Armor" : "Accessory",
  rarity: rarities[Math.floor(i / 12)],
  atk: i % 12 < 4 ? 4 + Math.floor(i / 12) * 5 : 0,
  hp: i % 12 >= 4 && i % 12 < 8 ? 20 + Math.floor(i / 12) * 25 : 0,
  def: i % 12 >= 4 && i % 12 < 8 ? 3 + Math.floor(i / 12) * 3 : 0,
  speed: i % 12 >= 8 ? 1 + Math.floor(i / 12) : 0,
  crit: i % 12 >= 8 ? 0.02 * (1 + Math.floor(i / 12)) : 0,
  resistance: elements[i % 8],
  bonus:
    Math.floor(i / 12) >= 3
      ? "Restores 2% max health each turn."
      : "10% resistance to its element.",
}));
export interface Objective {
  id: string;
  name: string;
  description: string;
  metric: string;
  goal: number;
  gold: number;
  gems: number;
}
export const quests: Objective[] = Array.from({ length: 30 }, (_, i) => ({
  id: `q${i}`,
  name:
    i < 6
      ? `Chapter ${i + 1}: ${regions[i].name}`
      : `${["Battle ready", "Pathfinder", "Bounty hunter", "Forge keeper", "The collector", "Rising star"][i % 6]} ${Math.floor(i / 6)}`,
  description:
    i < 6
      ? `Complete stage ${(i + 1) * 5}.`
      : `${["Win battles", "Complete dungeons", "Win raids", "Upgrade heroes", "Recruit heroes", "Open treasure chests"][i % 6]}.`,
  metric:
    i < 6
      ? "campaign"
      : ["battles", "dungeons", "raids", "upgrades", "recruits", "chests"][
          i % 6
        ],
  goal: i < 6 ? (i + 1) * 5 : Math.floor(i / 6) * [5, 2, 1, 3, 2, 2][i % 6],
  gold: 150 + i * 40,
  gems: 10 + i * 2,
}));
export const achievements: Objective[] = Array.from({ length: 20 }, (_, i) => ({
  id: `a${i}`,
  name: `${["Vanquisher", "Realmwalker", "Stronghold breaker", "Master artisan", "Gather the light"][i % 5]} ${Math.floor(i / 5) + 1}`,
  description: `Reach ${[10, 3, 2, 5, 5][i % 5] * (Math.floor(i / 5) + 1)} ${["battle victories", "dungeon clears", "raid victories", "upgrades", "recruited heroes"][i % 5]}.`,
  metric: ["battles", "dungeons", "raids", "upgrades", "recruits"][i % 5],
  goal: [10, 3, 2, 5, 5][i % 5] * (Math.floor(i / 5) + 1),
  gold: 300 + i * 50,
  gems: 25,
}));
export function advantage(a: Element, b: Element) {
  const cycle: Partial<Record<Element, Element>> = {
    Fire: "Nature",
    Nature: "Earth",
    Earth: "Lightning",
    Lightning: "Water",
    Water: "Fire",
    Air: "Earth",
    Light: "Dark",
    Dark: "Light",
  };
  return cycle[a] === b ? 1.25 : cycle[b] === a ? 0.8 : 1;
}
