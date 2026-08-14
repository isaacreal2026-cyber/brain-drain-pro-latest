/**
 * Real full-page screenshot capture for Brain Drain.
 *
 * Usage (from the repo root, after `pnpm build`):
 *   1. pnpm add -D playwright @playwright/test
 *   2. npx playwright install chromium
 *   3. node scripts/capture-screenshots.mjs
 *
 * It serves the production build from ./dist and writes PNGs into
 * ./screenshots/ at desktop (1440x900) and mobile (390x844) sizes.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..", "dist");

if (!existsSync(root)) {
  console.error("dist/ not found. Run `pnpm build` first.");
  process.exit(1);
}

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let url = decodeURIComponent(req.url.split("?")[0]);
    if (url === "/") url = "/index.html";
    const fp = join(root, url);
    if (!fp.startsWith(root)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    const data = await readFile(fp);
    res.writeHead(200, { "Content-Type": MIME[extname(fp)] || "application/octet-stream" });
    res.end(data);
  } catch {
    // SPA fallback
    const data = await readFile(join(root, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  }
});

await new Promise((r) => server.listen(4173, "127.0.0.1", r));
console.log("Serving dist on http://127.0.0.1:4173");

const outDir = resolve(__dirname, "..", "screenshots");
mkdirSync(outDir, { recursive: true });

const routes = [
  { path: "/", name: "01-home" },
  { path: "/search", name: "02-search" },
  { path: "/library", name: "03-library-brains" },
  { path: "/missions", name: "04-pathways" },
  { path: "/topics", name: "05-topics" },
  { path: "/community", name: "06-community" },
  { path: "/messages", name: "07-messages" },
  { path: "/notifications", name: "08-notifications" },
  { path: "/profile", name: "09-profile" },
  { path: "/settings", name: "10-settings" },
];

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844, isMobile: true },
];

const browser = await chromium.launch();

for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.isMobile,
  });
  const page = await ctx.newPage();
  for (const route of routes) {
    const url = `http://127.0.0.1:4173${route.path}`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    const file = join(outDir, `${route.name}-${vp.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log("saved", file);
  }
  // The onboarding tour is shown on first visit — capture it too.
  await ctx.addInitScript(() => localStorage.clear());
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(outDir, `00-onboarding-${vp.name}.png`), fullPage: true });
  await ctx.close();
}

await browser.close();
server.close();
console.log("Done. Screenshots are in", outDir);
