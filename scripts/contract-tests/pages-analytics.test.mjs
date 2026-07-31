import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import {
  ANALYTICS_MARKER,
  buildPagesAnalyticsLoader,
  PAGES_ORIGIN,
  PAGES_PATH_PREFIX,
  preparePagesSite,
  UMAMI_SCRIPT_URL
} from "../prepare-pages-site.mjs";

const WEBSITE_ID = "94db1cb1-74f4-4a40-ad6c-962362670409";
const VERSION = "0.7.0";

function createFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "hsqlite-pages-"));
  fs.writeFileSync(path.join(rootDir, "index.html"), "<!doctype html><html><head><title>Editor</title></head><body></body></html>\n");
  fs.writeFileSync(path.join(rootDir, "package.json"), JSON.stringify({ version: VERSION }));
  fs.writeFileSync(path.join(rootDir, "CHANGELOG.md"), "# Changes\n");
  fs.writeFileSync(path.join(rootDir, ".release-please-manifest.json"), JSON.stringify({ ".": VERSION }));
  return rootDir;
}

function executeLoader({ origin, pathname, doNotTrack = "0", globalPrivacyControl = false }) {
  const loader = buildPagesAnalyticsLoader({ websiteId: WEBSITE_ID, version: VERSION });
  const source = loader.replace(/^<script[^>]*>\n/, "").replace(/\n<\/script>$/, "");
  const appended = [];
  const document = {
    createElement(tagName) {
      assert.equal(tagName, "script");
      return { dataset: {} };
    },
    head: {
      appendChild(element) {
        appended.push(element);
      }
    }
  };
  const navigator = { doNotTrack, globalPrivacyControl };
  const window = { location: { origin, pathname }, doNotTrack: "", navigator };
  vm.runInNewContext(source, { document, navigator, window });
  return appended;
}

test("prepares a distinct Pages artifact and leaves standalone bytes unchanged", () => {
  const rootDir = createFixture();
  const sourcePath = path.join(rootDir, "index.html");
  const before = fs.readFileSync(sourcePath);
  const result = preparePagesSite({ rootDir, websiteId: WEBSITE_ID });
  const after = fs.readFileSync(sourcePath);
  const pagesHtml = fs.readFileSync(path.join(result.outputDir, "index.html"), "utf8");

  assert.deepEqual(after, before);
  assert.equal((pagesHtml.match(new RegExp(ANALYTICS_MARKER, "g")) || []).length, 1);
  assert.match(pagesHtml, new RegExp(WEBSITE_ID));
  assert.match(pagesHtml, /hsqlite-editor-v0\.7\.0/);
  assert.equal(result.tag, "hsqlite-editor-v0.7.0");
});

test("fails closed when the website ID is absent or malformed", () => {
  const rootDir = createFixture();
  assert.throws(() => preparePagesSite({ rootDir, websiteId: "" }), /valid UUID/);
  assert.throws(() => preparePagesSite({ rootDir, websiteId: "not-a-uuid" }), /valid UUID/);
});

test("does not load analytics outside the exact official Pages surface", () => {
  for (const location of [
    { origin: "null", pathname: "/tmp/editor.html" },
    { origin: "file://", pathname: "/tmp/editor.html" },
    { origin: "http://127.0.0.1:4173", pathname: PAGES_PATH_PREFIX },
    { origin: "http://localhost:4173", pathname: PAGES_PATH_PREFIX },
    { origin: PAGES_ORIGIN, pathname: "/" },
    { origin: "https://example.com", pathname: PAGES_PATH_PREFIX }
  ]) {
    assert.equal(executeLoader(location).length, 0, JSON.stringify(location));
  }
});

test("does not load analytics when DNT or GPC is enabled", () => {
  assert.equal(executeLoader({
    origin: PAGES_ORIGIN,
    pathname: PAGES_PATH_PREFIX,
    doNotTrack: "1"
  }).length, 0);
  assert.equal(executeLoader({
    origin: PAGES_ORIGIN,
    pathname: PAGES_PATH_PREFIX,
    globalPrivacyControl: true
  }).length, 0);
});

test("loads one minimized tracker on the official Pages surface", () => {
  const [tracker] = executeLoader({
    origin: PAGES_ORIGIN,
    pathname: PAGES_PATH_PREFIX
  });

  assert.equal(tracker.src, UMAMI_SCRIPT_URL);
  assert.equal(tracker.defer, true);
  assert.deepEqual({ ...tracker.dataset }, {
    websiteId: WEBSITE_ID,
    domains: "helbertm.github.io",
    doNotTrack: "true",
    excludeSearch: "true",
    excludeHash: "true",
    tag: "hsqlite-editor-v0.7.0"
  });
});
