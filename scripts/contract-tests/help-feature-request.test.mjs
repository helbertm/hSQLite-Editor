import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const template = fs.readFileSync(path.join(rootDir, "src/index.template.html"), "utf8");
const localization = fs.readFileSync(path.join(rootDir, "src/capabilities/03-localization.js"), "utf8");
const featureForm = fs.readFileSync(path.join(rootDir, ".github/ISSUE_TEMPLATE/feature.yml"), "utf8");

test("Help links to the scoped GitHub Feature request form without local data", () => {
  const link = template.match(/<a id="suggestImprovementLink"[^>]+>/)?.[0] || "";
  const href = link.match(/href="([^"]+)"/)?.[1] || "";

  assert.equal(href, "https://github.com/helbertm/hSQLite-Editor/issues/new?template=feature.yml");
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener noreferrer"/);
  assert.match(link, /data-i18n-aria-label="issues\.suggestTooltip"/);
  assert.doesNotMatch(href, /(?:body|description|proposal|title)=/i);
});

test("Feature request action is localized in every supported locale", () => {
  for (const label of ["Suggest improvement", "Sugerir melhoria", "Sugerir una mejora"]) {
    assert.match(localization, new RegExp(`"issues\\.suggest": "${label}"`));
  }
  assert.equal((localization.match(/"issues\.suggestTooltip":/g) || []).length, 3);
});

test("GitHub feature issue form remains available", () => {
  assert.match(featureForm, /^name: Feature request$/m);
  assert.match(featureForm, /^title: "\[Feature\]: "$/m);
});
