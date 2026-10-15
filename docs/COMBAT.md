# Combat and balance

## Resolution and turn order

The engine runs independently of Three.js and DOM. A seeded LCG (`1664525 * seed + 1013904223`, unsigned 32-bit) supplies combat randomness. Every round queues living units by effective speed, with stable ID tie-breaking. Speed is multiplied by 1.4 for Haste and 0.6 for Slow. New summons join the next round. A party is at most four persistent heroes; allied summons may temporarily increase the living side to five. Seventy rounds is the stalemate limit; the dungeon wins rather than allowing an endless healing loop.

Each turn restores one focus up to ten; Basic Attack and Guard restore two additional focus. Heroes start with six. Skills consume their declared focus and become available again after their declared cooldown in owner turns. Silence prevents special abilities but permits Basic Attack and Guard. Levels 1/3/5 unlock signature abilities.

A legal single-target attack must target a living opposing unit. Taunt restricts legal single-target enemies to living taunters. All-target attacks bypass Taunt. Healing targets living allies. Self and all-target skills execute directly; single-target skills require an explicit legal target. A rejected target does not spend focus or apply cooldowns.

## Damage

```
attack = base attack × AttackUp(1.35) × AttackDown(0.70) × passive modifiers
armor = base defense × DefenseUp(1.50) × DefenseDown(0.60)
raw = attack × ability power × 100 / (100 + 3 × armor)
raw *= elemental multiplier × critical multiplier × vulnerability × resistance
```

Damage is rounded and cannot fall below one before shield/invulnerability. Critical chance starts at 12% for heroes, 8% for enemies; a normal critical multiplies damage by 1.6. Individual passives alter these values. Equipment resistance stacks additively to a 50% cap. Invulnerability negates damage; shield absorbs damage before HP. Actual damage is capped to remaining HP for drain/reaction calculations. Multi-hit skills independently roll each hit.

Fire beats Nature, Nature beats Earth, Earth beats Lightning, Lightning beats Water, Water beats Fire. Air beats Earth. Light and Dark both have advantage over one another. Advantage is 1.25; a reverse matchup is 0.8 unless both have advantage, as with Light/Dark. Other pairs are neutral. There is no immunity from element alone.

## Status semantics

Poison, Burn, Bleed, and Damage over Time stack to three. Other effects have one stack and refresh their remaining duration. Start-of-turn damage is 4.5% max HP per stack; on bosses it is capped to 1.5% per stack. Regeneration heals 10% max HP per owner turn. Shield can accumulate to 70% max HP and has its own expiration marker. Status values are shown beside each health bar.

Durations count affected owner turns. Effects arriving from another actor apply through the target's next action, then decrement. Effects applied to self during an action begin counting on the next turn. Stun and Freeze each skip the specified number of turns. Freeze also breaks on direct damage. Boss Stun/Freeze is converted into Slow, preventing permanent control locks. Defense/Attack buffs and debuffs affect formulas; Curse increases incoming damage and reduces healing; Silence blocks skills; Taunt forces targeting; Invulnerability prevents damage and new harmful effects. Cleanse removes harmful statuses and preserves buffs.

## AI and bosses

The AI evaluates every legal available action and target. Scoring considers expected power, multi-hits, elemental advantage, a kill bonus, enemy count for area damage, missing allied health, useful new control, and whether buffs/shields are already present. Healing at full health and summoning at the side cap have zero utility. Behaviors emerge from faction-specific action sets: attackers, controllers, healers, tanks, and summoners. It never chooses an action by a random roll.

Major bosses have 600 + 100 × level max HP, adds, a dangerous area skill with a visible cooldown, a defensive skill, and a heavy single-target skill. At half health, they gain 30% attack, reset ability cooldowns, and gain Haste. Each faction also has its own phase event: goblin shield/taunt, treant regeneration, lich skeleton reinforcement, frost slowing aura, infernal party burn, and void party curse. Controlled boss encounters retain tactical counterplay through shields, cleanse, defense, healing, and focus management.

## Progression economy

Hero XP thresholds are 70 × current level. Training costs 45 × current level gold. Star promotion costs 10 × current stars shards and fifteen times that amount in gold. Ascension costs 10 × next tier materials and twenty times that amount in gold. Ability rank upgrades cost 3 × current rank materials and twenty times that in gold. Equipment enhancement costs 2 × current gear level ore and 60 × level gold, adding 15% of base gear stats per upgrade.

Campaign completion grants 150 + 25 × stage ID gold, plus 200 on first clear; 30 first-clear or 5 replay gems; 90 + 24 × ID party XP; tiered materials and ore; two targeted shard rewards; and one item. Raid difficulty multiplies base gold by 1 / 1.6 / 2.2, adds enemy levels, and increases material rewards. Chest loot adds 80 + 10 × stage level gold and three ore. Quests and achievements supplement the loop. All paths remain replayable.

## Simulation evidence and limits

`npm run simulate` writes `simulation-results.json` with 2,160 seeded encounter results (six parties × thirty stages × twelve seeds), 36 multi-wave raid runs, and a fresh-save campaign traversal that purchases Sylwen with starting gems, trains only with earned gold, claims earned quests, carries health across three encounters, and uses the actual shrine rule. It checks that campaign progression reaches stage 30.

The six tested compositions collectively include all twenty heroes and cover tank/poison/fire/heal, bruiser/archer/paladin/shield support, and control/evasion/debuff/combo. These are automated tactical choices rather than human playtesting; broad wins demonstrate attainability, not perfect competitive balance. Current simulations favor a forgiving single-player campaign. Default timing is roughly 1.5 seconds per action plus human decision time; 2× and 3× are optional. Late bosses take substantially more actions than early patrols. Real-world 60 FPS on a gaming laptop and subjective encounter pacing require hardware/player testing beyond cloud Chromium.

Per-hero report fields record conditional party win rate, survival, direct attack damage, and explicit ability healing. They do not attribute passive healing, retaliation, or damage-over-time ticks back to their source. These are contribution diagnostics, not isolated one-on-one hero rankings.
