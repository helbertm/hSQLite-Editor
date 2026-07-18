import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { getReleaseArtifactPath } from "./release-utils.mjs";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
const version = String(packageJson.version || "").trim();
const artifactPath = getReleaseArtifactPath(rootDir, version);
const channel = String(process.env.HSQLITE_NATIVE_CHROMIUM_CHANNEL || "chrome").trim();

if (!fs.existsSync(artifactPath)) {
  throw new Error(`Release artifact missing: ${path.relative(rootDir, artifactPath)}`);
}
if (!channel) throw new Error("HSQLITE_NATIVE_CHROMIUM_CHANNEL must not be empty.");

const browser = await chromium.launch({
  channel,
  headless: process.env.HSQLITE_NATIVE_HEADLESS !== "0"
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const remoteRequests = [];
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
  });

  await page.goto(pathToFileURL(artifactPath).href, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.dataset.bootState === "ready", null, { timeout: 30_000 });

  const localeResults = [];
  for (const locale of ["en-US", "pt-BR", "es-ES"]) {
    await page.locator("#localeSelect").selectOption(locale);
    await page.waitForFunction(expected => document.documentElement.lang === expected, locale);
    localeResults.push(await page.evaluate(expected => ({
      expected,
      documentLanguage: document.documentElement.lang,
      selectorValues: Array.from(document.querySelectorAll("[data-locale-select]"), element => element.value),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    }), locale));
  }

  const title = await page.title();
  if (title !== `hSQLite Editor v${version}`) throw new Error(`Unexpected release title: ${title}`);
  if (remoteRequests.length) throw new Error(`Native file mode made remote requests: ${remoteRequests.join(", ")}`);
  for (const result of localeResults) {
    if (result.documentLanguage !== result.expected || result.selectorValues.some(value => value !== result.expected)) {
      throw new Error(`Locale selectors are not synchronized for ${result.expected}.`);
    }
    if (result.horizontalOverflow) throw new Error(`Document overflows horizontally for ${result.expected}.`);
  }

  process.stdout.write(`${JSON.stringify({
    validatedAt: new Date().toISOString(),
    channel,
    browserVersion: browser.version(),
    artifact: path.relative(rootDir, artifactPath),
    artifactSha256: crypto.createHash("sha256").update(fs.readFileSync(artifactPath)).digest("hex"),
    title,
    remoteRequests: remoteRequests.length,
    locales: localeResults
  })}\n`);
} finally {
  await browser.close();
}
