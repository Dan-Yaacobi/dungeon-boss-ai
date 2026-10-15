import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--js-flags=--expose-gc",
  ],
});
const measurements = [];
try {
  for (const quality of ["default", "low"]) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      `${process.env.GAME_URL || "http://127.0.0.1:4173"}/${quality === "low" ? "?quality=low" : ""}`,
    );
    await page.locator('[data-action="new"]').click();
    await page.locator('[data-action="tutorial"]').click();
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => {
      (window as any).gc?.();
      return (performance as any).memory?.usedJSHeapSize ?? null;
    });
    const frames = await page.evaluate(async () => {
      const deltas: number[] = [];
      let last = performance.now();
      for (let i = 0; i < 60; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        deltas.push(now - last);
        last = now;
      }
      const sorted = deltas.slice(5).sort((a, b) => a - b);
      return {
        meanFPS: Math.round(
          1000 / (deltas.slice(5).reduce((a, b) => a + b, 0) / 55),
        ),
        medianMs: Math.round(sorted[Math.floor(sorted.length * 0.5)]),
        p95Ms: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
      };
    });
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-action="hero"]').first().click();
      if (i === 0 && quality === "low") {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: "docs/hero.png" });
      }
      await page.locator('[data-action="town"]').first().click();
    }
    const after = await page.evaluate(() => {
      (window as any).gc?.();
      return (performance as any).memory?.usedJSHeapSize ?? null;
    });
    const renderer = await page.evaluate(() => {
      const gl = document.querySelector("canvas")!.getContext("webgl2")!;
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : "unknown";
    });
    measurements.push({
      quality,
      viewport: "1280x800",
      renderer,
      frames,
      heapBefore: before,
      heapAfterFiveSceneCycles: after,
      errors,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  "docs/performance-results.json",
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      note: "Cloud software-rendering measurements. Not a gaming-laptop 60 FPS certification; JS heap is diagnostic, GPU disposal has regression tests.",
      measurements,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify(measurements, null, 2));
if (measurements.some((m) => m.errors.length)) process.exitCode = 1;
