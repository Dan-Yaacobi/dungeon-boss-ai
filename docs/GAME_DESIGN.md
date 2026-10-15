# Dungeon Realms design

## Pillars and setting

A party of miniature fantasy champions restores the Shattered Crown across six fallen realms. The central pleasures are readable team tactics, collecting distinct champions, a compact toy-like world, and a persistent cycle of expedition rewards and upgrades. Original models combine layered armor, expressive faces, sculpted heads, weapons, hats, capes, crests, horns, wings, and accessories. The camera looks into a small diorama rather than following a realistic third-person avatar.

The reference goal was the original Dungeon Boss's four-character collectible party and staged room encounters. External reference sites returned policy 403 responses in this environment; no claim is made that screenshots or gameplay videos were inspected. The implementation uses original procedural art and a fantasy interface with gold trim, elemental accents, portrait cards, turn order, focus, and visible enemy telegraphs.

## Connected loop

Main menu → 3D town → hero collection/training/party → campaign or raid inspection → room traversal → combat → chest → combat → shrine → final encounter → rewards → upgrades → new region. Town buildings are raycast-clickable and have explicit UI equivalents for accessibility. The eight destinations are Hero Hall, Training Grounds, Blacksmith, Portal, Dungeon Gate, Raid Board, Treasury, and Quest Board.

The six regions contain five sequential stages each. The fifth stage in each region ends with a major boss. Other final rooms contain regular guardians. Stages contain three encounters plus a chest and a healing shrine; health and focus carry between battles. Shrines restore 40% max health, revive fallen heroes at 25%, reset cooldowns, and refill focus. Treasure is kept even after retreat. First clears advance the campaign; replays remain available without energy limits. Clearing stage 30 restores the crown and invites endgame raids.

Twelve strongholds each have three or four defense waves plus a commander. Each has a faction, visible modifier, level, and three difficulty settings. The first strongholds are immediately accessible; later strongholds unlock with their campaign region. Normal/Hard/Nightmare add 0/5/10 enemy levels and improve resource rewards. Raid modifiers are garrison shields, stronger poison, reduced healing, reinforcement, elemental surge, or elite statistics.

## Collection and economy

Four starter heroes: Aldric, Nyra, Brakka, Ember. All twenty heroes can be inspected. Other heroes begin with five shards; ten shards recruit a hero. Targeted portal invocations cost 35 earned gems for five shards. There is no random draw. First clears grant 30 gems; repeat clears grant five; quests and achievements provide more. All shards remain useful for star promotion.

Gold pays for training, rank promotion, ascension, crafting, and enhancement. Materials pay for abilities and ascension. Ore pays for crafting and enhancement. There are no purchases, ads, waiting gates, accounts, or backend.

Heroes gain party XP even when defeated. Gold training grants enough XP to cross a level threshold. Stars increase base/growth stats by 12% per extra star, to six stars. Ascension adds 15% per tier, to five tiers, gated by levels 5/10/15/20/25. Abilities unlock at levels 1/3/5 and have ten ranks. Progression caps at level 60.

The equipment catalog contains sixty named entries: five rarity tiers, each with four weapons, four armors, and four accessories. Slots give attack, health/defense, or speed/critical bonuses. Each piece has elemental resistance. Epic and Legendary pieces provide renewal. Equipped items are unique instances and transfer between heroes; selling equipped items is rejected. Enhancement scales base stats, caps at +19, and consumes gold and ore. All tiers are craftable.

## Objectives and persistence

Thirty quests track campaign milestones, battles, clears, raids, upgrades, recruitment, and chests. Twenty achievements reward longer-term cumulative objectives. Every objective reads an actual gameplay metric, can be completed, and can only be claimed once.

Version-one saves retain all roster progression, ability ranks, equipment, inventory, resources, clear history, raid history, objectives, party, and settings. Save imports validate known content identities, value ranges, equipment references, and party membership before a confirmed replacement. The running expedition is not serialized.

## Audio and controls

The score synthesizes changing arpeggios and bass tones for town, dungeon, battle, and boss contexts. UI, strike, spell, victory, and defeat effects use separate gain scaling. Audio begins only after a gesture, satisfying browser autoplay restrictions. Settings exposes independent music and effects sliders, combat speed, shadows, and save tools.

Mouse controls every screen. Number keys select combat actions; Enter targets the first legal unit, Escape pauses or returns to town. Responsive layouts accommodate narrower screens; desktop remains the primary target.
