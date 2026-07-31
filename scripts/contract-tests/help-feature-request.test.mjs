import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { ALLOWED_SQLITE_EXTENSIONS } from "../../src/capabilities/32a-database-file-constants.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const template = fs.readFileSync(path.join(rootDir, "src/index.template.html"), "utf8");
const localization = fs.readFileSync(path.join(rootDir, "src/capabilities/03-localization.js"), "utf8");
const additionalLocalization = fs.readFileSync(path.join(rootDir, "src/capabilities/03a-localization-messages.js"), "utf8");
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

test("Help documents the exact supported SQLite file contract", () => {
  const filesSection = template.match(/<section id="helpSqliteFiles"[\s\S]*?<\/section>/)?.[0] || "";
  const documentedExtensions = Array.from(
    filesSection.matchAll(/<li><code data-i18n-ignore>(\.[^<]+)<\/code><\/li>/g),
    match => match[1]
  );

  assert.deepEqual(documentedExtensions, ALLOWED_SQLITE_EXTENSIONS);
  assert.match(filesSection, /<code>SQLite format 3<\/code>/);
  assert.match(filesSection, /Arquivos SQLite 1 e 2 não são abertos/);
  assert.match(additionalLocalization, /\["help\.filesFormatHtml"/);
});

test("Help uses a semantic document layout for session continuity", () => {
  const helpDialog = template.match(/<div class="modal help-modal"[^>]+>/)?.[0] || "";
  const helpDocument = template.match(/<div class="help-document">[\s\S]*?<div class="modal-actions modal-actions-split">/)?.[0] || "";

  assert.match(helpDialog, /aria-describedby="helpIntro"/);
  assert.match(helpDocument, /<nav class="help-index"[^>]+data-i18n-aria-label="help\.navLabel"/);
  assert.match(helpDocument, /href="#helpGettingStarted" data-modal-initial="true"/);
  assert.equal((helpDocument.match(/<section id="help/g) || []).length, 8);
  assert.match(helpDocument, /href="#helpHistoryFavorites"[^>]+data-i18n="help\.historyTitle"/);
  assert.match(helpDocument, /href="#helpSqlMap"[^>]+data-i18n="help\.sqlMapTitle"/);
  assert.match(helpDocument, /<section id="helpHistoryFavorites" tabindex="-1">/);
  assert.match(helpDocument, /<section id="helpSqlMap" tabindex="-1">/);
  assert.match(helpDocument, /data-i18n="help\.sqlMapTeachingBody"/);
  assert.match(helpDocument, /data-i18n="help\.sqlMapVirtualBody"/);
  assert.match(helpDocument, /<table class="help-event-table">/);
  assert.match(helpDocument, /<caption data-i18n="help\.eventsCaption">/);
  assert.equal((helpDocument.match(/<th scope="row"/g) || []).length, 3);
  assert.match(helpDocument, /data-i18n="help\.notRestoredDatabase"/);
  assert.match(helpDocument, /data-i18n-html="help\.backupHtml"/);
  assert.doesNotMatch(template.match(/<button id="closeHelpBtn"[^>]+>/)?.[0] || "", /data-modal-initial/);
  assert.doesNotMatch(template, /class="help-grid"/);
  assert.doesNotMatch(additionalLocalization, /\["help\.gridHtml"/);
});
