import { test, expect } from "@playwright/test";
test("fresh adventure: roster, recruit, equip, full dungeon, rewards, save reload", async ({
  page,
}) => {
  page.setDefaultTimeout(15000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await expect(
    page.getByRole("button", { name: "Begin your adventure" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Begin your adventure" }).click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.screenshot({ path: "docs/town.png" });
  await page.locator('[data-action="roster"]').first().click();
  await expect(page.locator(".hero-card")).toHaveCount(20);
  await page.locator('[data-action="hero"][data-id="h0"]').click();
  await expect(
    page.getByRole("heading", { name: "Aldric Ironshield" }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Train ·" }).click();
  await expect(page.locator(".stat-grid")).toContainText("2");
  await page.locator('[data-action="town"]').first().click();
  await page.locator('[data-action="portal"]').first().click();
  await page.locator('[data-action="summon"][data-id="h4"]').click();
  await page.getByRole("button", { name: "Recruit ·" }).click();
  await page.locator('[data-action="party"]').first().click();
  await page.locator('[data-action="toggle-party"][data-id="h2"]').click();
  await page.locator('[data-action="toggle-party"][data-id="h4"]').click();
  await page.locator('[data-action="inventory"]').click();
  await expect(page.locator(".item-card")).toHaveCount(3);
  await page.locator('[data-action="equip"][data-uid="g0"]').click();
  await expect(page.locator(".item-card").first()).toContainText(
    "Equipped: Sylwen Thorn",
  );
  await page.locator('[data-action="campaign"]').click();
  await page.locator('[data-action="select-stage"][data-index="0"]').click();
  await page.locator('[data-action="start-stage"]').click();
  await page.locator('[data-action="advance-room"]').click();
  await expect(page.locator(".action-bar")).toBeVisible();
  await page.screenshot({ path: "docs/battle.png" });
  // Exercise manual input before turning on tactical auto-combat.
  await expect(page.locator(".unit-label.enemy").first()).toBeVisible();
  await page.locator(".unit-label.enemy").first().click();
  await page.locator('[data-action="cycle-speed"]').click();
  await page.locator('[data-action="cycle-speed"]').click();
  await page.locator('[data-action="auto"]').click();
  for (let room = 0; room < 5; room++) {
    await expect(page.locator(".room-card,.reward-card")).toBeVisible({
      timeout: 100000,
    });
    if (await page.locator(".reward-card").count()) break;
    await page.locator('[data-action="advance-room"]').click();
  }
  await expect(page.locator(".reward-card")).toBeVisible({ timeout: 100000 });
  await expect(page.locator(".reward-card")).toContainText("Victory");
  await page.screenshot({ path: "docs/victory.png" });
  await page.locator('[data-action="finish-run"]').click();
  await page.reload();
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await expect(page.locator(".chapter-card")).toContainText("1 / 30");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dungeon-realms-v1")!),
  );
  expect(state.clears).toEqual([0]);
  expect(state.heroes.h4.unlocked).toBe(true);
  expect(state.metrics.battles).toBe(3);
  expect(state.metrics.chests).toBe(1);
  expect(errors).toEqual([]);
});
test("all management views and mobile layout load without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await page.getByRole("button", { name: "Begin your adventure" }).click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  for (const screen of [
    "roster",
    "campaign",
    "raids",
    "inventory",
    "quests",
    "forge",
    "portal",
    "treasury",
    "settings",
  ]) {
    await page.evaluate(
      (s) =>
        (
          document.querySelector(`[data-action="${s}"]`) as HTMLButtonElement
        )?.click(),
      screen,
    );
    if (
      screen === "forge" ||
      screen === "portal" ||
      screen === "treasury" ||
      screen === "settings"
    ) {
      await page.locator('[data-action="town"]').first().click();
      await page.locator(`[data-action="${screen}"]`).first().click();
    }
    await page.locator('[data-action="town"]').first().click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-action="roster"]').first().click();
  await expect(page.locator(".hero-card")).toHaveCount(20);
  await page.screenshot({ path: "docs/mobile.png" });
  expect(errors).toEqual([]);
});

test("multi-wave raid defeats its named commander and grants repeatable rewards", async ({
  page,
}) => {
  const { freshSave } = await import("../../src/state");
  const s = freshSave();
  s.tutorial = false;
  s.heroes.h4.unlocked = true;
  s.party = ["h0", "h1", "h3", "h4"];
  for (const id of s.party) s.heroes[id].level = 10;
  s.settings.speed = 3;
  await page.addInitScript(
    (data) => localStorage.setItem("dungeon-realms-v1", JSON.stringify(data)),
    s,
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator('[data-action="raids"]').first().click();
  await expect(page.locator(".raid-card")).toHaveCount(12);
  await page.locator('[data-action="select-raid"][data-index="0"]').click();
  await expect(page.locator(".panel")).toContainText("Shielded garrison");
  await page.locator('[data-action="start-raid"]').click();
  await page.locator('[data-action="advance-room"]').click();
  await page.locator('[data-action="auto"]').click();
  for (let wave = 0; wave < 4; wave++) {
    await expect(page.locator(".room-card,.reward-card")).toBeVisible({
      timeout: 100000,
    });
    if (await page.locator(".reward-card").count()) break;
    await page.locator('[data-action="advance-room"]').click();
    if (wave === 2) {
      await expect(page.locator("#unit-labels")).toContainText(
        "Captain Copperfang",
      );
      await page.screenshot({ path: "docs/raid-commander.png" });
    }
  }
  await expect(page.locator(".reward-card")).toBeVisible({ timeout: 100000 });
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("dungeon-realms-v1")!),
  );
  expect(state.raidWins).toContain(0);
  expect(state.metrics.raids).toBe(1);
  expect(state.campaign).toBe(0);
  expect(errors).toEqual([]);
});

test("save export, invalid import rejection and valid import replacement", async ({
  page,
}) => {
  await page.goto("/?quality=low");
  await page.getByRole("button", { name: "Begin your adventure" }).click();
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.locator('[data-action="settings"]').click();
  const downloadPromise = page.waitForEvent("download");
  await page.locator('[data-action="export"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("dungeon-realms-save.json");
  const file = await download.path();
  expect(file).toBeTruthy();
  let chooserPromise = page.waitForEvent("filechooser");
  await page.locator('[data-action="import"]').click();
  await (
    await chooserPromise
  ).setFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator(".toast")).toContainText("Import rejected");
  chooserPromise = page.waitForEvent("filechooser");
  await page.locator('[data-action="import"]').click();
  await (await chooserPromise).setFiles(file!);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator(".town-title")).toContainText("Wayfarer");
});

test("the final dungeon restores the crown and unlocks the endgame hub", async ({
  page,
}) => {
  const { freshSave } = await import("../../src/state");
  const s = freshSave();
  s.tutorial = false;
  s.campaign = 29;
  s.clears = Array.from({ length: 29 }, (_, i) => i);
  s.metrics.campaign = 29;
  s.heroes.h4.unlocked = true;
  s.party = ["h0", "h1", "h3", "h4"];
  for (const id of s.party) s.heroes[id].level = 40;
  s.settings.speed = 3;
  await page.addInitScript(
    (data) => localStorage.setItem("dungeon-realms-v1", JSON.stringify(data)),
    s,
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?quality=low");
  await page.getByRole("button", { name: "Continue your journey" }).click();
  await page.locator('[data-action="next-stage"]').click();
  await expect(page.locator(".panel")).toContainText("The Shattered Crown");
  await page.locator('[data-action="start-stage"]').click();
  await page.locator('[data-action="advance-room"]').click();
  await page.locator('[data-action="auto"]').click();
  for (let room = 0; room < 5; room++) {
    await expect(page.locator(".room-card,.reward-card")).toBeVisible({
      timeout: 100000,
    });
    if (await page.locator(".reward-card").count()) break;
    await page.locator('[data-action="advance-room"]').click();
    if (room === 3) {
      await expect(page.locator("#unit-labels")).toContainText(
        "The Hollow Sovereign",
      );
      await page.screenshot({ path: "docs/void-boss.png" });
    }
  }
  await expect(page.locator(".reward-card")).toContainText(
    "THE SHATTERED CROWN IS RESTORED",
    { timeout: 100000 },
  );
  await page.locator('[data-action="finish-run"]').click();
  await expect(page.locator(".chapter-card")).toContainText("A realm reborn");
  await expect(page.locator(".chapter-card")).toContainText("30 / 30");
  expect(errors).toEqual([]);
});
