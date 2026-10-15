import "@fontsource/cinzel/latin-500.css";
import "@fontsource/cinzel/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "./style.css";
import {
  heroes,
  colors,
  regions,
  stages,
  raids,
  items,
  quests,
  achievements,
  rarities,
  elements,
  basic,
  guard,
  type Ability,
  type ItemDef,
} from "./content";
import {
  freshSave,
  loadSave,
  persist,
  validateSave,
  stats,
  train,
  recruit,
  rankUp,
  ascend,
  upgradeAbility,
  equip,
  enhance,
  sell,
  claim,
  summon,
  craft,
  grantReward,
  type Save,
  type Reward,
} from "./state";
import { World } from "./scene";
import { AudioEngine } from "./audio";
import {
  createBattle,
  nextTurn,
  act,
  chooseAI,
  available,
  targetsFor,
  living,
  type Battle,
  type Unit,
} from "./combat";
const app = document.querySelector<HTMLDivElement>("#app")!;
const world = new World(document.querySelector<HTMLCanvasElement>("#world")!);
const audio = new AudioEngine();
let save: Save = loadSave() ?? freshSave(),
  exists = !!loadSave(),
  screen = "menu",
  selectedHero = "h0",
  region = 0,
  difficulty = 0,
  chosenStage = 0,
  chosenRaid = 0,
  gearSlot = 0,
  questTab = "quests";
let battle: Battle | null = null,
  busy = false,
  selectedAbility = -1,
  auto = false,
  paused = false,
  token = 0,
  reward: Reward | null = null;
interface Run {
  kind: "campaign" | "raid";
  id: number;
  region: number;
  level: number;
  room: number;
  rooms: string[];
  difficulty: number;
  modifier: string;
  carry?: Unit[];
}
let run: Run | null = null;
const icons: Record<string, string> = {
  Light: "☀",
  Dark: "☾",
  Earth: "◆",
  Fire: "♨",
  Nature: "❧",
  Lightning: "ϟ",
  Water: "◈",
  Air: "≋",
  Tank: "⛨",
  Assassin: "⚔",
  Mage: "✦",
  Healer: "✚",
  Archer: "➶",
};
const el = (element: string) =>
  `<span class="element" style="--el:${colors[element as keyof typeof colors]}">${icons[element] ?? "✦"} ${element}</span>`;
const btn = (text: string, action: string, extra = "", cls = "") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
const portrait = (id: string, size = "") => {
  const h = heroes.find((x) => x.id === id)!;
  return `<div class="portrait ${size} ${h.look}" style="--hero:${colors[h.element]}"><span class="portrait-hair"></span><span class="portrait-face"><i></i><i></i></span><span class="portrait-body">${icons[h.element]}</span></div>`;
};
function commit() {
  persist(save);
  exists = true;
  audio.music = save.settings.music;
  audio.sfx = save.settings.sfx;
  world.renderer.shadowMap.enabled =
    save.settings.shadows &&
    new URLSearchParams(location.search).get("quality") !== "low";
}
function notify(text: string) {
  const old = document.querySelector(".toast");
  old?.remove();
  const d = document.createElement("div");
  d.className = "toast";
  d.textContent = text;
  document.body.append(d);
  setTimeout(() => d.remove(), 3500);
}
function header() {
  return `<header><button class="brand" data-action="town"><span class="crest">♜</span><span>DUNGEON <b>REALMS</b><small>THE SHATTERED CROWN</small></span></button><div class="resources"><span title="Gold · Training and crafting">◉ <b>${Math.floor(save.gold).toLocaleString()}</b></span><span title="Gems · Targeted hero shards">◆ <b>${save.gems}</b></span><span title="Ability and ascension materials">✦ <b>${save.materials}</b></span><span title="Equipment materials">⬡ <b>${save.ore}</b></span></div><div class="header-actions">${btn("♫", "settings", 'title="Settings"')}${btn("☰", "pause", 'title="Pause and save options"')}</div></header>`;
}
function nav() {
  return `<nav class="bottom-nav">${[
    ["town", "⌂", "Town"],
    ["roster", "♟", "Heroes"],
    ["campaign", "⚑", "Campaign"],
    ["raids", "⚔", "Raids"],
    ["inventory", "⬡", "Equipment"],
    ["quests", "▤", "Quests"],
  ]
    .map(([id, icon, title]) =>
      btn(
        `<span>${icon}</span>${title}`,
        id,
        "",
        screen === id ? "active" : "",
      ),
    )
    .join("")}</nav>`;
}
function panel(title: string, kicker: string, body: string, extra = "") {
  return `${header()}<section class="panel ${extra}"><div class="panel-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1></div>${btn("×", "town", 'aria-label="Close panel"', "close")}</div>${body}</section>${nav()}`;
}
function menu() {
  world.town();
  audio.theme = "menu";
  return `<div class="menu-shade"></div><div class="main-menu"><div class="eyebrow">AN ORIGINAL HERO-COLLECTION ADVENTURE</div><div class="menu-crest">♜</div><h1>DUNGEON<br><em>REALMS</em></h1><p class="subtitle">THE SHATTERED CROWN</p><div class="ornament">──── ✦ ────</div><p>Twenty heroes. Six fallen realms.<br>One crown worth fighting for.</p>${exists ? btn("Continue your journey →", "continue", "", "primary large") : ""}${btn(exists ? "Begin a new adventure" : "Begin your adventure →", "new", "", "primary large")}${btn("Import save", "import", "", "text-button")}<small>Single player · No accounts · No waiting timers</small></div><div class="menu-corner">ORIGINAL PROCEDURAL 3D WORLD<br>Headphones recommended</div>`;
}
function town() {
  return `${header()}<div class="town-title"><span class="eyebrow">YOUR ADVENTURE STARTS HERE</span><h1>Wayfarer’s Rest</h1><p>A little light at the edge of the unknown.</p></div><div class="chapter-card"><span class="eyebrow">${save.campaign >= 30 ? "THE CROWN RESTORED" : "YOUR NEXT CHAPTER"}</span><h2>${save.campaign >= 30 ? "A realm reborn" : stages[save.campaign].name}</h2><p>${save.campaign >= 30 ? "The Hollow Sovereign has fallen. Master Nightmare raids and gather every hero." : regions[Math.floor(save.campaign / 5)].name + " · Stage " + (save.campaign + 1)}</p>${btn(save.campaign >= 30 ? "Explore endgame raids →" : "Continue adventure →", save.campaign >= 30 ? "raids" : "next-stage", "", "primary")}<div class="chapter-progress"><span style="width:${(save.campaign / 30) * 100}%"></span></div><small>${save.campaign} / 30 stages restored</small></div><div class="town-buildings">${[
    ["roster", "HERO HALL", "Meet your champions"],
    ["training", "TRAINING GROUNDS", "Build your strength"],
    ["forge", "BLACKSMITH", "Forge your legacy"],
    ["portal", "SUMMONING PORTAL", "A new ally awaits"],
    ["raids", "RAID BOARD", "Challenge the strongholds"],
    ["quests", "QUEST BOARD", "Claim your bounties"],
    ["campaign", "DUNGEON GATE", "Explore the fallen realms"],
    ["treasury", "TREASURY", "Your gathered riches"],
  ]
    .map(([a, n, s]) => btn(`<b>${n}</b><small>${s}</small>`, a))
    .join(
      "",
    )}</div><div class="party-dock"><div><span class="eyebrow">YOUR ADVENTURING PARTY</span><small>Click a hero to inspect · ${save.party.length}/4</small></div><div class="party-faces">${save.party.map((id) => btn(`${portrait(id)}<span>${heroes.find((h) => h.id === id)!.name.split(" ")[0]}</span><small>Lv. ${save.heroes[id].level}</small>`, "hero", `data-id="${id}"`)).join("")}${btn("＋<small>Edit party</small>", "party")}</div></div>${nav()}${save.tutorial ? `<div class="tutorial"><b>Welcome, Wayfarer.</b><p>Your first four heroes are ready. Enter the Goblin Warrens, choose an ability, then click an enemy. Visit the Portal to recruit Sylwen for healing.</p>${btn("Let’s begin", "tutorial", "", "primary")}</div>` : ""}`;
}
function roster() {
  return panel(
    "Your champions",
    `${Object.values(save.heroes).filter((h) => h.unlocked).length} / 20 HEROES COLLECTED`,
    `<div class="toolbar"><p>Every legend starts with a name. Every team tells a different story.</p>${btn("Assemble party →", "party", "", "primary")}</div><div class="hero-grid">${heroes
      .map((h) => {
        const p = save.heroes[h.id];
        return `<button class="hero-card ${p.unlocked ? "" : "locked"} rarity-${h.rarity.toLowerCase()}" data-action="hero" data-id="${h.id}"><div class="hero-card-top">${el(h.element)}<span>${p.unlocked ? `Lv. ${p.level}` : "LOCKED"}</span></div>${portrait(h.id, "big")}<div class="stars">${"★".repeat(p.stars)}${"☆".repeat(6 - p.stars)}</div><h3>${h.name}</h3><p>${h.role} <span>· ${h.rarity}</span></p><div class="mini-progress"><i style="width:${Math.min(100, (p.shards / 10) * 100)}%"></i></div><small>${p.unlocked ? h.passive.split(":")[0] : `${p.shards}/10 shards · View unlock method`}</small></button>`;
      })
      .join("")}</div>`,
  );
}
function hero() {
  const h = heroes.find((h) => h.id === selectedHero)!,
    p = save.heroes[h.id],
    s = stats(save, h.id);
  return `${header()}<div class="hero-view-label">${el(h.element)}<div class="stars">${"★".repeat(p.stars)}</div><h1>${h.name}</h1><p>${h.rarity} ${h.role}</p>${btn("← All heroes", "roster", "", "text-button")}</div><section class="hero-detail"><div class="eyebrow">${p.unlocked ? "YOUR CHAMPION" : "A LEGEND YET TO BE FOUND"}</div><h2>${h.name}</h2><p>${h.description}</p><div class="stat-grid">${[
    ["Level", p.level],
    ["Health", Math.round(s.hp)],
    ["Attack", Math.round(s.atk)],
    ["Defense", Math.round(s.def)],
    ["Speed", Math.round(s.speed)],
    ["Critical", `${Math.round(s.crit * 100)}%`],
  ]
    .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`)
    .join(
      "",
    )}</div><div class="xp-bar"><i style="width:${(p.xp / (p.level * 70)) * 100}%"></i></div><small>${p.xp} / ${p.level * 70} XP · Ascension ${p.ascension}/5</small><div class="passive"><b>✧ ${h.passive.split(":")[0]}</b><p>${h.passive.split(":")[1]}</p></div><h3>Signature abilities</h3>${h.abilities.map((a, i) => `<div class="ability-detail ${p.level < [1, 3, 5][i] ? "muted" : ""}"><span class="ability-symbol" style="--hero:${colors[h.element]}">${["✦", "✧", "❖"][i]}</span><div><b>${a.name} <small>Rank ${p.abilities[i]}</small></b><p>${a.description} ${a.cost} focus · ${a.cooldown} turn cooldown</p><small>${p.level < [1, 3, 5][i] ? `Unlocks at level ${[1, 3, 5][i]}` : ""}</small></div>${p.unlocked ? btn("↑", "ability-up", `data-index="${i}" title="Upgrade: ${p.abilities[i] * 3} materials and ${p.abilities[i] * 60} gold"`) : ""}</div>`).join("")}<div class="hero-upgrades">${p.unlocked ? `${btn(`Train · ${p.level * 45} ◉`, "train", "", "primary")}${btn(`Rank up · ${p.stars * 10} shards`, "rank")}${btn("Ascend", "ascend")}${btn(save.party.includes(h.id) ? "In your party" : "Add to party", "party")}` : btn(`Recruit · ${p.shards}/10 shards`, "recruit", "", "primary")}</div><p class="hint">${h.unlock}</p><h3>Equipment ${btn("Manage →", "inventory", "", "text-button")}</h3><div class="equipment-slots">${(
    ["Weapon", "Armor", "Accessory"] as const
  )
    .map((slot) => {
      const g = save.inventory.find((g) => g.uid === p.equipment[slot]);
      return btn(
        `<small>${slot}</small>${g ? items.find((i) => i.id === g.id)!.name : "Empty slot"}`,
        "unequip",
        `data-slot="${slot}" title="Click to unequip"`,
      );
    })
    .join("")}</div></section>${nav()}`;
}
function party() {
  return panel(
    "Assemble your party",
    "FOUR HEROES. COUNTLESS POSSIBILITIES.",
    `<div class="party-summary"><h3>${save.party.length} / 4 selected</h3><p>Mix protection, damage, healing, and control. Selected heroes travel together through every room.</p>${btn("Ready for adventure →", run ? "resume-run" : "campaign", "", "primary")}</div><div class="hero-grid compact">${heroes
      .filter((h) => save.heroes[h.id].unlocked)
      .map(
        (h) =>
          `<button class="hero-card ${save.party.includes(h.id) ? "chosen" : ""}" data-action="toggle-party" data-id="${h.id}">${portrait(h.id)}<h3>${h.name}</h3>${el(h.element)}<p>${h.role} · Lv. ${save.heroes[h.id].level}</p><b>${save.party.includes(h.id) ? "✓ SELECTED" : "+ ADD TO PARTY"}</b></button>`,
      )
      .join("")}</div>`,
  );
}
function campaign() {
  return panel(
    "The fallen realms",
    "CAMPAIGN · RESTORE THE SHATTERED CROWN",
    `<div class="region-tabs">${regions.map((r, i) => btn(`<span>0${i + 1}</span>${r.name}`, "region", `data-index="${i}"`, region === i ? "active" : "")).join("")}</div><div class="region-banner" style="--region:${regions[region].color}"><span class="region-emblem">${["♜", "❧", "☠", "❄", "♨", "☾"][region]}</span><div><div class="eyebrow">CHAPTER ${region + 1} · LEVEL ${region * 5 + 1}–${region * 5 + 5}</div><h2>${regions[region].name}</h2><p>${regions[region].subtitle}</p></div><span class="region-count">${save.clears.filter((id) => Math.floor(id / 5) === region).length}/5<br><small>RESTORED</small></span></div><div class="stage-list">${stages
      .filter((s) => s.region === region)
      .map(
        (s) =>
          `<button class="stage-card ${s.id > save.campaign ? "locked" : ""}" data-action="select-stage" data-index="${s.id}" ${s.id > save.campaign ? "disabled" : ""}><span class="stage-number">${save.clears.includes(s.id) ? "✓" : s.boss ? "♛" : String(s.index + 1).padStart(2, "0")}</span><div><small>${s.boss ? "REGION BOSS" : "DUNGEON"} · LEVEL ${s.level}</small><h3>${s.name}</h3><p>${s.boss ? regions[region].boss : "Two patrols, hidden treasure, and a final guardian"}</p></div><div class="stage-reward">◉ ${150 + s.id * 25}<small>${save.clears.includes(s.id) ? "REPLAY" : "FIRST CLEAR: +200 ◉ · 30 ◆"}</small></div><span class="arrow">${s.id > save.campaign ? "⌑" : "→"}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="hint">Fire → Nature → Earth → Lightning → Water → Fire · Air → Earth · Light ↔ Dark. Advantage +25%; disadvantage −20%.</div>`,
  );
}
function prepare(raid = false) {
  const info = raid ? raids[chosenRaid] : stages[chosenStage];
  const loot = grantReward(
    structuredClone(save),
    info.id,
    raid,
    raid ? difficulty : 0,
  );
  return panel(
    info.name,
    raid ? "ENEMY STRONGHOLD · PVE RAID" : "PREPARE YOUR EXPEDITION",
    `<div class="expedition-layout"><div class="expedition-art" style="--region:${regions[info.region].color}"><div>${raid ? "⚔" : "♜"}</div><h2>${regions[info.region].name}</h2><p>${regions[info.region].subtitle}</p></div><div><h2>${raid ? "Break the stronghold" : "Into the unknown"}</h2><p>${raid ? `${raids[chosenRaid].waves} defense waves and a commander. ${raids[chosenRaid].modifier}.` : "Interconnected rooms with patrols, a treasure cache, a healing shrine, and a final battle."}</p>${raid ? `<div class="difficulty">${["Normal", "Hard", "Nightmare"].map((n, i) => btn(n, "difficulty", `data-index="${i}"`, difficulty === i ? "active" : "")).join("")}</div><p>Recommended level ${info.level + difficulty * 5} · Rewards ×${(1 + difficulty * 0.6).toFixed(1)}</p>` : `<p>Recommended hero level ${info.level}</p>`}<div class="loot-preview"><small>EXPEDITION REWARDS</small><p>◉ ${Math.floor(loot.gold)} · ◆ ${loot.gems} · ✦ ${loot.materials} · ⬡ ${loot.ore}</p><small>${loot.shards.map((x) => `${heroes.find((h) => h.id === x.id)!.name}: ${x.count} shards`).join(" · ")}<br>${items.find((i) => i.id === loot.item)!.rarity} equipment · ${loot.xp} party XP</small></div><h3>Your party ${btn("Edit", "party", "", "text-button")}</h3><div class="prepare-party">${save.party.map((id) => `<div>${portrait(id)}<b>${heroes.find((h) => h.id === id)!.name.split(" ")[0]}</b><small>Lv. ${save.heroes[id].level}</small></div>`).join("")}</div><div class="hint">Health carries between rooms. Shrines restore 40% health and revive fallen heroes at 25%. You can retreat, keeping chest loot.</div>${btn(raid ? "Begin raid →" : "Enter dungeon →", raid ? "start-raid" : "start-stage", "", "primary large")}</div></div>`,
  );
}
function raidScreen() {
  return panel(
    "Enemy strongholds",
    "RAIDS · PLUNDER THE FACTIONS",
    `<p class="intro">Storm their walls. Defeat their commander. Bring home the spoils.<br>Repeatable PvE challenges with Normal, Hard, and Nightmare rewards.</p><div class="raid-grid">${raids.map((r) => `<button class="raid-card" data-action="select-raid" data-index="${r.id}" ${save.campaign < r.region * 5 ? "disabled" : ""} style="--region:${regions[r.region].color}"><div class="raid-art"><span>${["♜", "❧", "☠", "❄", "♨", "☾"][r.region]}</span><small>${save.raidWins.includes(r.id) ? "✓ CONQUERED" : `${r.waves} WAVES + COMMANDER`}</small></div><div class="raid-info"><small>${regions[r.region].name} · Lv. ${r.level}</small><h3>${r.name}</h3><p>✧ ${r.modifier}</p><span>${save.campaign < r.region * 5 ? "Unlock this campaign region" : "Inspect stronghold →"}</span></div></button>`).join("")}</div>`,
  );
}
function portal() {
  return panel(
    "The celestial portal",
    "A HERO IS A PROMISE OF POSSIBILITY",
    `<div class="portal-intro"><span>✧</span><div><h2>Call a champion</h2><p>Choose your hero. Each invocation grants <b>5 shards for 35 gems</b>.<br>Recruit at 10 shards. No random draws, duplicates, or waiting.</p></div></div><div class="hero-grid compact">${heroes.map((h) => `<button class="hero-card" data-action="summon" data-id="${h.id}">${portrait(h.id)}<h3>${h.name}</h3>${el(h.element)}<p>${save.heroes[h.id].shards} shards · ${save.heroes[h.id].unlocked ? "Recruited" : "10 to recruit"}</p><b>Invoke · 35 ◆</b></button>`).join("")}</div>`,
  );
}
function inventory() {
  return panel(
    "The armory",
    "EQUIPMENT · CRAFT • EQUIP • ENHANCE",
    `<div class="toolbar"><label>Equip to <select id="equip-hero">${heroes
      .filter((h) => save.heroes[h.id].unlocked)
      .map(
        (h) =>
          `<option value="${h.id}" ${selectedHero === h.id ? "selected" : ""}>${h.name}</option>`,
      )
      .join(
        "",
      )}</select></label>${btn("Visit blacksmith →", "forge", "", "primary")}</div><div class="inventory-grid">${save.inventory
      .map((g) => {
        const d = items.find((x) => x.id === g.id)!;
        const owner = heroes.find((h) =>
          Object.values(save.heroes[h.id].equipment).includes(g.uid),
        );
        const equipped = save.heroes[selectedHero].equipment[d.slot],
          old = save.inventory.find((x) => x.uid === equipped),
          oldDef = items.find((x) => x.id === old?.id);
        const compare =
          d.atk +
          d.def +
          d.hp / 5 +
          d.speed -
          (oldDef ? oldDef.atk + oldDef.def + oldDef.hp / 5 + oldDef.speed : 0);
        return `<article class="item-card rarity-${d.rarity.toLowerCase()}"><div class="item-icon">${d.slot === "Weapon" ? "⚔" : d.slot === "Armor" ? "⛨" : "◈"}</div><small>${d.rarity} ${d.slot} · +${g.level - 1}</small><h3>${d.name}</h3><p>${d.atk ? `Attack +${(d.atk * (1 + (g.level - 1) * 0.15)).toFixed(0)}` : ""}${d.hp ? `Health +${(d.hp * (1 + (g.level - 1) * 0.15)).toFixed(0)} · Defense +${(d.def * (1 + (g.level - 1) * 0.15)).toFixed(0)}` : ""}${d.speed ? `Speed +${d.speed} · Critical +${Math.round(d.crit * 100)}%` : ""}</p><p>10% ${d.resistance} resistance${Number(d.id.slice(4)) >= 36 ? " · Renewal: 2% HP/turn" : ""}</p><small class="${compare >= 0 ? "positive" : "negative"}">${compare >= 0 ? "+" : ""}${compare.toFixed(0)} base power vs equipped</small><p>${owner ? `Equipped: ${owner.name}` : "Available"}</p><div class="item-actions">${btn(owner?.id === selectedHero ? "Unequip" : "Equip", "equip", `data-uid="${g.uid}"`)}${btn(`↑ ${g.level * 2} ⬡`, "enhance", `data-uid="${g.uid}" title="Also costs ${g.level * 60} gold"`)}${btn("Sell", "sell", `data-uid="${g.uid}"`)}</div></article>`;
      })
      .join("")}</div>`,
  );
}
function forge() {
  return panel(
    "Ember & anvil",
    "THE BLACKSMITH",
    `<div class="forge-banner"><span>⚒</span><div><h2>Strength, forged by hand.</h2><p>Turn raid ore into equipment. All five rarities are craftable.<br>Enhance existing equipment in the armory, up to +19.</p></div></div><div class="difficulty">${["Weapon", "Armor", "Accessory"].map((s, i) => btn(s, "gear-slot", `data-index="${i}"`, gearSlot === i ? "active" : "")).join("")}</div><div class="craft-grid">${rarities.map((r, i) => `<article class="item-card rarity-${r.toLowerCase()}"><div class="item-icon">${gearSlot === 0 ? "⚔" : gearSlot === 1 ? "⛨" : "◈"}</div><h3>${r} ${["Weapon", "Armor", "Accessory"][gearSlot]}</h3><p>${8 + i * 6} ore · ${(8 + i * 6) * 25} gold</p><small>One of four crafted variants.</small>${btn("Forge equipment", "craft", `data-index="${i}"`, "primary")}</article>`).join("")}</div>${btn("Open armory →", "inventory", "", "text-button")}`,
  );
}
function questScreen() {
  const list = questTab === "quests" ? quests : achievements;
  return panel(
    "Tales worth telling",
    "QUESTS & ACHIEVEMENTS",
    `<div class="difficulty">${btn("Quest log", "quest-tab", 'data-id="quests"', questTab === "quests" ? "active" : "")}${btn("Achievements", "quest-tab", 'data-id="achievements"', questTab === "achievements" ? "active" : "")}</div><div class="quest-list">${list
      .map((q) => {
        const current = Math.min(q.goal, save.metrics[q.metric] ?? 0),
          claimed = save.claimed.includes(q.id);
        return `<article class="quest"><span class="quest-icon">${claimed ? "✓" : current >= q.goal ? "✦" : "▤"}</span><div><h3>${q.name}</h3><p>${q.description}</p><div class="mini-progress"><i style="width:${(current / q.goal) * 100}%"></i></div><small>${current} / ${q.goal}</small></div><div class="quest-prize">◉ ${q.gold} · ◆ ${q.gems}${btn(claimed ? "Claimed" : current >= q.goal ? "Claim reward" : "In progress", "claim", `data-id="${q.id}" ${claimed || current < q.goal ? "disabled" : ""}`, current >= q.goal && !claimed ? "primary" : "")}</div></article>`;
      })
      .join("")}</div>`,
  );
}
function settings() {
  return panel(
    "Make yourself at home",
    "SETTINGS & SAVE DATA",
    `<div class="settings-grid"><div><h3>Sound & performance</h3><label>Music <input type="range" id="music" min="0" max="1" step=".05" value="${save.settings.music}"></label><label>Sound effects <input type="range" id="sfx" min="0" max="1" step=".05" value="${save.settings.sfx}"></label><label>Combat speed <select id="speed">${[1, 2, 3].map((x) => `<option ${save.settings.speed === x ? "selected" : ""} value="${x}">${x}×</option>`).join("")}</select></label><label>Shadows <input id="shadows" type="checkbox" ${save.settings.shadows ? "checked" : ""}></label></div><div><h3>Your adventure, kept safe.</h3><p>Progress autosaves after rewards, upgrades, and collection changes. Export a backup to carry your adventure to another browser.</p>${btn("Export save", "export", "", "primary")}${btn("Import save", "import")}${btn("Main menu", "main-menu")}<p class="hint">An active expedition is not saved. Return to town after a dungeon to keep completion rewards. Treasure and completed battles save immediately.</p><h3>Combat field guide</h3><p>Turn order follows speed each round. Basic attacks and Guard restore focus. Abilities unlock at levels 1, 3, and 5.</p><p>Damage effects stack up to 3 times. Other statuses refresh duration. Freeze breaks when hit. Stun and Freeze skip turns. Silence blocks special abilities. Taunt forces single-target attacks.</p><p>Fire → Nature → Earth → Lightning → Water → Fire. Air beats Earth. Light and Dark both beat one another. Advantage ×1.25; disadvantage ×0.8.</p></div></div>`,
  );
}
function treasury() {
  return panel(
    "The treasury",
    "EVERY COIN HAS A STORY",
    `<div class="treasury-grid">${[
      [
        "◉",
        "Gold",
        save.gold,
        "Training, equipment, and hero upgrades. Earned in every dungeon.",
      ],
      [
        "◆",
        "Gems",
        save.gems,
        "Targeted hero shards. Earned from first clears, quests, and replays.",
      ],
      [
        "✦",
        "Upgrade materials",
        save.materials,
        "Ability ranks and ascension. Earned from dungeon and raid rewards.",
      ],
      [
        "⬡",
        "Equipment ore",
        save.ore,
        "Crafting and enhancement. Earned from chests and expeditions.",
      ],
    ]
      .map(
        ([i, n, v, d]) =>
          `<article class="item-card"><div class="item-icon">${i}</div><h2>${n}</h2><h1>${v}</h1><p>${d}</p></article>`,
      )
      .join("")}</div>${btn("Claim quest rewards →", "quests", "", "primary")}`,
  );
}
function roomScreen() {
  if (!run) return "";
  const kind = run.rooms[run.room];
  return `${header()}<div class="room-card"><span class="eyebrow">${run.kind === "raid" ? "STRONGHOLD" : "DUNGEON"} · ROOM ${run.room + 1} / ${run.rooms.length}</span><div class="room-glyph">${kind === "treasure" ? "▣" : kind === "healing" ? "❧" : "⚔"}</div><h1>${kind === "treasure" ? "A forgotten cache" : kind === "healing" ? "The wayfarer’s shrine" : kind === "boss" ? "The guardian awaits" : "Shadows ahead"}</h1><p>${kind === "treasure" ? "Under dust and old banners, something still shines." : kind === "healing" ? "A little warmth, even here. Restore your party before the final room." : "Your party presses deeper into the dungeon."}</p><div class="room-path">${run.rooms.map((r, i) => `<span class="${i === run!.room ? "current" : i < run!.room ? "done" : ""}">${i < run!.room ? "✓" : r === "treasure" ? "▣" : r === "healing" ? "✚" : r === "boss" ? "♛" : "⚔"}</span>`).join("<i></i>")}</div>${btn(kind === "treasure" ? "Open the chest" : kind === "healing" ? "Receive the blessing" : "Enter battle", "advance-room", "", "primary large")}${btn("Retreat to town", "retreat", "", "text-button")}</div>`;
}
function battleUI() {
  if (!battle || !run) return "";
  const active = battle.units.find((u) => u.id === battle!.current),
    a = active
      ? selectedAbility === -2
        ? guard
        : selectedAbility === -1
          ? basic
          : active.abilities[selectedAbility]
      : basic;
  return `<div class="battle-top"><div>${btn("← Retreat", "retreat")}<span class="eyebrow">${regions[run.region].name} · ${run.kind === "raid" ? "RAID" : "DUNGEON"}</span><h2>${run.kind === "raid" ? raids[run.id].name : stages[run.id].name}</h2><small>ROOM ${run.room + 1}/${run.rooms.length} · ROUND ${battle.round} ${run.modifier ? "· " + run.modifier : ""}</small></div><div class="battle-tools">${btn(auto ? "Auto: ON" : "Auto: OFF", "auto", "", auto ? "active" : "")}${btn(`${save.settings.speed}×`, "cycle-speed")}${btn("Ⅱ", "pause")}</div></div><div class="turn-track"><span>TURN ORDER</span>${[
    battle.current,
    ...battle.queue,
  ]
    .filter(Boolean)
    .slice(0, 8)
    .map((id, i) => {
      const u = battle!.units.find((u) => u.id === id);
      return u && u.hp > 0
        ? `<span class="turn-token ${i === 0 ? "current" : ""} ${u.side}" style="--el:${colors[u.element]}" title="${u.name}">${icons[u.element]}<small>${u.name.split(" ")[0]}</small></span>`
        : "";
    })
    .join("")}</div><div id="unit-labels">${battle.units
    .filter((u) => u.hp > 0)
    .map(
      (u) =>
        `<button class="unit-label ${u.side} ${battle!.current === u.id ? "current" : ""}" data-action="target" data-id="${u.id}"><span class="unit-name">${u.boss ? "♛ " : ""}${u.name}<small>Lv.${u.level}</small></span><span class="health-bar"><i style="width:${(u.hp / u.maxHp) * 100}%"></i>${u.shield > 0 ? `<em style="width:${Math.min(100, (u.shield / u.maxHp) * 100)}%"></em>` : ""}</span><span class="health-text">${Math.ceil(u.hp)} / ${Math.ceil(u.maxHp)} ${u.shield > 0 ? `· ⛨${Math.round(u.shield)}` : ""}</span><span class="statuses">${u.effects.map((e) => `<span title="${e.name}: ${e.turns} turns, ${e.stacks} stacks">${e.name} ${e.turns}${e.stacks > 1 ? "×" + e.stacks : ""}</span>`).join("")}</span>${u.boss ? `<span class="boss-warning">${u.phase ? "PHASE II · ENRAGED · CONTROL RESIST" : `⚠ ${u.abilities[0].name}: ` + (u.cooldowns[0] > 0 ? `${u.cooldowns[0]} turns` : "READY")}</span>` : ""}</button>`,
    )
    .join(
      "",
    )}</div><div class="combat-log"><span class="eyebrow">BATTLE CHRONICLE</span>${battle.log
    .slice(0, 3)
    .map((l) => `<p>${l}</p>`)
    .join(
      "",
    )}</div><div class="battle-bottom"><div class="active-hero">${active?.side === "hero" && heroes.some((h) => h.id === active.defId) ? portrait(active.defId) : '<div class="enemy-sigil">⚔</div>'}<div><span class="eyebrow">${busy ? "RESOLVING ACTION" : active?.side === "hero" ? "YOUR TURN" : "ENEMY TURN"}</span><h2>${active?.name ?? "The battle settles…"}</h2><span class="focus">${active ? "◆".repeat(Math.floor(active.mana)) + "◇".repeat(10 - Math.floor(active.mana)) : ""}</span></div></div><div class="action-bar">${
    active?.side === "hero"
      ? [-1, ...active.abilities.map((_, i) => i), -2]
          .map((index) => {
            const x =
              index === -1
                ? basic
                : index === -2
                  ? guard
                  : active.abilities[index];
            return btn(
              `<span class="action-icon">${index === -1 ? "⚔" : index === -2 ? "⛨" : ["✦", "✧", "❖"][index]}</span><b>${x.name}</b><small>${index >= 0 ? (active.cooldowns[index] > 0 ? `${active.cooldowns[index]} turn cooldown` : `${x.cost} focus`) : index === -1 ? "Restore 2 focus" : "Defend & recover"}</small>`,
              "ability",
              `data-index="${index}" title="${x.description}" ${busy || !available(battle!, active, index) ? "disabled" : ""}`,
              selectedAbility === index ? "selected" : "",
            );
          })
          .join("")
      : '<p class="enemy-thinking">The enemy is planning its next move…</p>'
  }</div><div class="target-hint"><b>${busy ? "Steel meets fate…" : active?.side === "hero" ? a?.name : "Watch the enemy formation"}</b><span>${busy ? "" : (a?.description ?? "")}</span><small>${!busy && active?.side === "hero" ? "Choose an ability, then click a highlighted target. Keys 1–5 select actions." : ""}</small></div></div>${paused ? `<div class="modal-backdrop"><div class="dialog"><span class="eyebrow">TAKE A BREATH</span><h1>Adventure paused</h1><p>The battle will wait for you.</p>${btn("Resume battle", "unpause", "", "primary large")}${btn("Export save", "export")}${btn("Retreat to town", "retreat")}</div></div>` : ""}`;
}
function rewardScreen() {
  return `${header()}<div class="reward-card"><span class="eyebrow">${save.campaign >= 30 ? "THE SHATTERED CROWN IS RESTORED" : "EXPEDITION COMPLETE"}</span><div class="victory-glyph">♛</div><h1>Victory, Wayfarer.</h1><p>${run?.kind === "raid" ? "The stronghold has fallen. Its spoils are yours." : "Another light returns to the fallen realms."}</p>${reward ? `<div class="reward-grid"><div>◉<b>${Math.floor(reward.gold)}</b><small>Gold</small></div><div>◆<b>${reward.gems}</b><small>Gems</small></div><div>✦<b>${reward.materials}</b><small>Materials</small></div><div>⬡<b>${reward.ore}</b><small>Ore</small></div></div><p>+${reward.xp} XP for every party hero ${reward.first ? "· FIRST CLEAR BONUS" : ""}</p><div class="reward-loot"><b>${items.find((i) => i.id === reward!.item)!.name}</b><p>${reward.shards.map((x) => `${heroes.find((h) => h.id === x.id)!.name} ×${x.count} shards`).join("<br>")}</p></div>` : ""}${btn("Return to town →", "finish-run", "", "primary large")}${btn("Inspect your heroes", "reward-roster", "", "text-button")}</div>`;
}
function render() {
  let html = "";
  switch (screen) {
    case "menu":
      html = menu();
      break;
    case "town":
      html = town();
      break;
    case "roster":
      html = roster();
      break;
    case "hero":
      html = hero();
      break;
    case "party":
      html = party();
      break;
    case "campaign":
      html = campaign();
      break;
    case "prepare":
      html = prepare();
      break;
    case "prepare-raid":
      html = prepare(true);
      break;
    case "raids":
      html = raidScreen();
      break;
    case "portal":
      html = portal();
      break;
    case "inventory":
      html = inventory();
      break;
    case "forge":
      html = forge();
      break;
    case "quests":
      html = questScreen();
      break;
    case "settings":
      html = settings();
      break;
    case "treasury":
      html = treasury();
      break;
    case "room":
      html = roomScreen();
      break;
    case "battle":
      html = battleUI();
      break;
    case "rewards":
      html = rewardScreen();
      break;
  }
  app.innerHTML = html;
  app.className = `screen-${screen}`;
  if (screen === "battle") positionLabels();
}
function go(to: string) {
  if (to === "inventory" && !save.heroes[selectedHero].unlocked)
    selectedHero = save.party[0];
  if (to === "town") audio.theme = "town";
  if (to === "training") {
    selectedHero = save.party[0];
    to = "hero";
  }
  if (to === "hero") {
    world.showHero(heroes.find((h) => h.id === selectedHero)!);
  } else if (to === "town" || (screen === "hero" && to !== "battle"))
    world.town();
  screen = to;
  render();
}
function positionLabels() {
  if (!battle) return;
  for (const u of battle.units) {
    const node = app.querySelector<HTMLElement>(
        `.unit-label[data-id="${u.id}"]`,
      ),
      p = world.project(u.id);
    if (node && p) {
      node.style.left = `${p.x}px`;
      node.style.top = `${p.y}px`;
    }
  }
}
setInterval(() => {
  if (screen === "battle") positionLabels();
}, 30);
function startRun(raid: boolean) {
  token++;
  auto = false;
  paused = false;
  const info = raid ? raids[chosenRaid] : stages[chosenStage];
  run = {
    kind: raid ? "raid" : "campaign",
    id: info.id,
    region: info.region,
    level: info.level + (raid ? difficulty * 5 : 0),
    difficulty: raid ? difficulty : 0,
    modifier: raid ? raids[chosenRaid].modifier : "",
    room: 0,
    rooms: raid
      ? [...Array(raids[chosenRaid].waves).fill("battle"), "boss"]
      : [...stages[chosenStage].rooms],
  };
  world.arena(
    run.region,
    save.party.map((id) => {
      const b = createBattle(save, run!.region, run!.level);
      return b.units.find((u) => u.id === id)!;
    }),
  );
  screen = "room";
  audio.theme = "dungeon";
  render();
}
function enterRoom() {
  if (!run) return;
  const kind = run.rooms[run.room];
  if (kind === "treasure") {
    save.gold += 80 + run.level * 10;
    save.ore += 3;
    save.metrics.chests++;
    commit();
    notify(`Treasure found: ${80 + run.level * 10} gold and 3 ore.`);
    run.room++;
    render();
    return;
  }
  if (kind === "healing") {
    run.carry?.forEach((u) => {
      u.hp = Math.min(
        u.maxHp,
        u.hp <= 0 ? u.maxHp * 0.25 : u.hp + u.maxHp * 0.4,
      );
      u.mana = 10;
      u.cooldowns = u.cooldowns.map(() => 0);
    });
    notify("The shrine restores your party. Fallen heroes return.");
    run.room++;
    commit();
    render();
    return;
  }
  battle = createBattle(
    save,
    run.region,
    run.level,
    kind === "boss" && (run.kind === "raid" || stages[run.id].boss),
    Date.now() % 2147483647,
    run.carry,
    run.modifier,
    run.kind === "raid" ? `commander${run.id}` : undefined,
  );
  world.arena(run.region, battle.units, kind === "boss");
  world.selected = battle.current;
  audio.theme = kind === "boss" ? "boss" : "battle";
  screen = "battle";
  busy = false;
  selectedAbility = -1;
  render();
  scheduleAI();
}
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function scheduleAI() {
  if (!battle || battle.winner || busy || paused || screen !== "battle") return;
  const u = battle.units.find((u) => u.id === battle!.current);
  if (u && (u.side === "enemy" || auto)) {
    const local = token;
    setTimeout(() => {
      if (
        local !== token ||
        paused ||
        busy ||
        screen !== "battle" ||
        battle?.current !== u.id ||
        (u.side === "hero" && !auto)
      )
        return;
      const a = chooseAI(battle!, u);
      void execute(a.index, a.targetId);
    }, 450 / save.settings.speed);
  }
}
async function execute(index: number, target?: string) {
  if (!battle || busy || paused) return;
  const local = token;
  try {
    busy = true;
    const event = act(battle, index, target);
    const actor = battle.units.find((u) => u.id === event.actor)!;
    audio.play(
      event.type === "attack" &&
        !/mage|archer|druid|priest|necromancer|warlock|plague|firelord|mermaid|lich|sovereign/.test(
          actor.look,
        )
        ? "hit"
        : "spell",
    );
    world.animate(event, save.settings.speed);
    render();
    await delay(480 / save.settings.speed);
    if (local !== token) return;
    for (const r of event.results) {
      const p = world.project(r.id);
      if (p) {
        const n = document.createElement("div");
        n.className = `damage-number ${event.type === "heal" ? "healing" : ""}`;
        n.textContent = `${r.crit ? "CRIT " : ""}${event.type === "heal" ? "+" : r.value ? "-" : ""}${Math.round(r.value) || r.label || event.ability}`;
        n.style.left = p.x + "px";
        n.style.top = p.y + 50 + "px";
        document.body.append(n);
        setTimeout(() => n.remove(), 1200);
      }
    }
    await delay(600 / save.settings.speed);
    if (local !== token) return;
    world.sync(battle.units);
    if (battle.winner) {
      busy = false;
      finishBattle();
      return;
    }
    nextTurn(battle);
    world.sync(battle.units);
    busy = false;
    selectedAbility = -1;
    if (battle.winner) {
      finishBattle();
      return;
    }
    world.selected = battle.current;
    render();
    scheduleAI();
  } catch (err) {
    busy = false;
    notify((err as Error).message);
    render();
  }
}
function finishBattle() {
  if (!battle || !run) return;
  if (battle.winner === "enemy") {
    audio.play("defeat");
    notify(
      "Your party has fallen. Keep your chest loot, train, and return stronger.",
    );
    token++;
    run = null;
    battle = null;
    commit();
    go("town");
    return;
  }
  save.metrics.battles++;
  run.carry = structuredClone(battle.units.filter((u) => u.side === "hero"));
  commit();
  run.room++;
  if (run.room >= run.rooms.length) {
    reward = grantReward(save, run.id, run.kind === "raid", run.difficulty);
    commit();
    audio.play("victory");
    world.mode = "victory";
    screen = "rewards";
    render();
  } else {
    notify("Encounter won. Your party moves onward.");
    screen = "room";
    audio.theme = "dungeon";
    world.roomObject(run.rooms[run.room]);
    render();
  }
}
function confirmDialog(title: string, message: string, fn: () => void) {
  const overlay = document.createElement("div");
  overlay.className = "modal-backdrop";
  overlay.innerHTML = `<div class="dialog"><h2>${title}</h2><p>${message}</p><div>${btn("Cancel", "cancel-dialog")}${btn("Confirm", "confirm-dialog", "", "primary")}</div></div>`;
  document.body.append(overlay);
  overlay
    .querySelector('[data-action="cancel-dialog"]')!
    .addEventListener("click", () => overlay.remove());
  overlay
    .querySelector('[data-action="confirm-dialog"]')!
    .addEventListener("click", () => {
      overlay.remove();
      fn();
    });
}
function retreat() {
  confirmDialog(
    "Leave this expedition?",
    "Chest loot and finished battle objectives are kept. The current encounter and completion rewards will be lost.",
    () => {
      token++;
      run = null;
      battle = null;
      busy = false;
      paused = false;
      world.selected = null;
      commit();
      go("town");
    },
  );
}
function exportSave() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(save, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "dungeon-realms-save.json";
  a.click();
  URL.revokeObjectURL(url);
  notify("Save exported.");
}
function importSave() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    try {
      const text = await input.files?.[0]?.text();
      if (!text) return;
      const next = validateSave(JSON.parse(text));
      confirmDialog(
        "Import this adventure?",
        "This replaces the current local save.",
        () => {
          token++;
          save = next;
          run = null;
          battle = null;
          commit();
          go("town");
          notify("Adventure restored.");
        },
      );
    } catch (e) {
      notify(`Import rejected: ${(e as Error).message}`);
    }
  };
  input.click();
}
async function handle(action: string, data: DOMStringMap = {}) {
  audio.play();
  const id = data.id ?? selectedHero,
    index = Number(data.index);
  try {
    switch (action) {
      case "new":
        if (exists) {
          confirmDialog(
            "Begin a new adventure?",
            "Your current save will be replaced. Export it first if you want a backup.",
            () => {
              save = freshSave();
              run = null;
              battle = null;
              commit();
              go("town");
            },
          );
        } else {
          save = freshSave();
          commit();
          go("town");
        }
        return;
      case "continue":
        go("town");
        return;
      case "tutorial":
        save.tutorial = false;
        commit();
        render();
        return;
      case "hero":
        selectedHero = id;
        go("hero");
        return;
      case "region":
        region = index;
        render();
        return;
      case "next-stage":
        chosenStage = Math.min(29, save.campaign);
        go("prepare");
        return;
      case "select-stage":
        if (index > save.campaign) return;
        chosenStage = index;
        go("prepare");
        return;
      case "select-raid":
        chosenRaid = index;
        go("prepare-raid");
        return;
      case "difficulty":
        difficulty = index;
        render();
        return;
      case "start-stage":
        startRun(false);
        return;
      case "start-raid":
        startRun(true);
        return;
      case "advance-room":
        enterRoom();
        return;
      case "resume-run":
        go(run?.kind === "raid" ? "prepare-raid" : "prepare");
        return;
      case "toggle-party":
        if (save.party.includes(id)) {
          if (save.party.length === 1)
            throw Error("Keep at least one hero in the party.");
          save.party = save.party.filter((x) => x !== id);
        } else {
          if (save.party.length >= 4)
            throw Error("Remove a hero first. Party maximum is four.");
          save.party.push(id);
        }
        break;
      case "train":
        train(save, selectedHero);
        notify("Training complete. Level increased!");
        break;
      case "rank":
        rankUp(save, selectedHero);
        notify("Star rank increased!");
        break;
      case "ascend":
        ascend(save, selectedHero);
        notify("Hero ascended!");
        break;
      case "ability-up":
        upgradeAbility(save, selectedHero, index);
        notify("Ability upgraded.");
        break;
      case "recruit":
        recruit(save, selectedHero);
        notify("A new champion joins your collection!");
        audio.play("victory");
        break;
      case "summon":
        summon(save, id);
        notify(`Received 5 ${heroes.find((h) => h.id === id)!.name} shards.`);
        if (!save.heroes[id].unlocked && save.heroes[id].shards >= 10) {
          selectedHero = id;
          commit();
          go("hero");
          return;
        }
        break;
      case "gear-slot":
        gearSlot = index;
        render();
        return;
      case "craft": {
        const g = craft(save, index, gearSlot);
        notify(`Forged ${items.find((i) => i.id === g.id)!.name}.`);
        break;
      }
      case "equip": {
        const uid = data.uid!;
        const g = save.inventory.find((g) => g.uid === uid)!;
        const slot = items.find((i) => i.id === g.id)!.slot;
        if (save.heroes[selectedHero].equipment[slot] === uid)
          delete save.heroes[selectedHero].equipment[slot];
        else equip(save, selectedHero, uid);
        break;
      }
      case "unequip":
        delete save.heroes[selectedHero].equipment[
          data.slot as ItemDef["slot"]
        ];
        break;
      case "enhance":
        enhance(save, data.uid!);
        notify("Equipment enhanced.");
        break;
      case "sell":
        confirmDialog(
          "Sell this item?",
          "The item will be removed and converted to gold.",
          () => {
            try {
              sell(save, data.uid!);
              commit();
              render();
            } catch (e) {
              notify((e as Error).message);
            }
          },
        );
        return;
      case "quest-tab":
        questTab = id;
        render();
        return;
      case "claim":
        claim(save, id);
        notify("Bounty claimed.");
        break;
      case "ability":
        if (!battle || busy || paused) return;
        selectedAbility = index;
        render();
        {
          const u = battle.units.find((u) => u.id === battle!.current)!;
          const a =
            index === -1 ? basic : index === -2 ? guard : u.abilities[index];
          if (
            a.target === "self" ||
            a.target === "allAllies" ||
            a.target === "allEnemies"
          )
            await execute(index);
        }
        return;
      case "target":
        if (!battle || busy || paused) return;
        {
          const u = battle.units.find((u) => u.id === battle!.current);
          if (u?.side === "hero") {
            const a =
              selectedAbility === -1
                ? basic
                : selectedAbility === -2
                  ? guard
                  : u.abilities[selectedAbility];
            if (targetsFor(battle, u, a).some((t) => t.id === id))
              await execute(selectedAbility, id);
            else notify("That target is not valid for this ability.");
          }
        }
        return;
      case "auto":
        auto = !auto;
        render();
        scheduleAI();
        return;
      case "cycle-speed":
        save.settings.speed = (save.settings.speed % 3) + 1;
        commit();
        render();
        return;
      case "pause":
        if (screen === "battle") {
          paused = true;
          render();
        } else go("settings");
        return;
      case "unpause":
        paused = false;
        render();
        scheduleAI();
        return;
      case "retreat":
        retreat();
        return;
      case "finish-run":
        run = null;
        battle = null;
        go("town");
        return;
      case "reward-roster":
        run = null;
        battle = null;
        go("roster");
        return;
      case "main-menu":
        go("menu");
        return;
      case "export":
        exportSave();
        return;
      case "import":
        importSave();
        return;
      default:
        if (
          [
            "town",
            "roster",
            "party",
            "campaign",
            "raids",
            "portal",
            "inventory",
            "forge",
            "quests",
            "settings",
            "treasury",
            "training",
          ].includes(action)
        ) {
          if (run && screen === "battle") {
            retreat();
            return;
          }
          go(action);
          return;
        }
    }
    commit();
    render();
  } catch (e) {
    notify((e as Error).message);
  }
}
app.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (b && !b.disabled) void handle(b.dataset.action!, b.dataset);
});
app.addEventListener("change", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === "equip-hero") {
    selectedHero = t.value;
    render();
    return;
  }
  if (t.id === "speed") save.settings.speed = Number(t.value);
  if (t.id === "shadows") save.settings.shadows = t.checked;
  commit();
});
app.addEventListener("input", (e) => {
  const t = e.target as HTMLInputElement;
  if (t.id === "music") save.settings.music = Number(t.value);
  if (t.id === "sfx") save.settings.sfx = Number(t.value);
  commit();
});
window.addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input,select")) return;
  if (e.key === "Escape") {
    if (screen === "battle") void handle(paused ? "unpause" : "pause");
    else if (screen !== "menu") go("town");
  }
  if (screen === "battle" && battle && !busy && !paused) {
    const u = battle.units.find((u) => u.id === battle!.current);
    if (u?.side === "hero") {
      const keys = [-1, ...u.abilities.map((_, i) => i), -2];
      const n = Number(e.key) - 1;
      if (n >= 0 && n < keys.length && available(battle, u, keys[n]))
        void handle("ability", { index: String(keys[n]) });
      if (e.key === "Enter") {
        const a =
          selectedAbility === -1
            ? basic
            : selectedAbility === -2
              ? guard
              : u.abilities[selectedAbility];
        const t = targetsFor(battle, u, a)[0];
        if (t) void execute(selectedAbility, t.id);
      }
    }
  }
});
world.onPick = (id) => {
  if (screen === "town") void handle(id);
  else if (screen === "battle") void handle("target", { id });
};
audio.music = save.settings.music;
audio.sfx = save.settings.sfx;
world.renderer.shadowMap.enabled =
  save.settings.shadows &&
  new URLSearchParams(location.search).get("quality") !== "low";
render();
