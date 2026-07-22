import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReleasePackageName,
  assertStableReleaseVersion,
  escapeRegExp,
  extractInlineScripts,
  extractMarkupText,
  getReleaseArtifactPath,
  getReleaseTag
} from "../release-utils.mjs";

test("escapeRegExp treats every regular-expression metacharacter literally", () => {
  const input = String.raw`0.3.143\\candidate+test?(x)[y]{z}^$|*`;
  const pattern = new RegExp(`^${escapeRegExp(input)}$`);

  assert.equal(pattern.test(input), true);
  assert.equal(pattern.test(`${input}suffix`), false);
});

test("extractInlineScripts recognizes case-insensitive tags and quoted attributes", () => {
  const scripts = extractInlineScripts(`
    <!-- <script>ignored()</script> -->
    <SCRIPT type="text/javascript" nonce="test" data-label=">">first()</SCRIPT>
    <script>second()</script   >
  `);

  assert.deepEqual(scripts.map((source) => source.trim()), ["first()", "second()"]);
});

test("extractInlineScripts rejects unclosed script elements", () => {
  assert.throws(() => extractInlineScripts("<script>unfinished()"), /Unclosed <script> element/);
});

test("extractInlineScripts rejects external script sources", () => {
  assert.throws(
    () => extractInlineScripts('<script SRC="https://example.test/runtime.js"></script>'),
    /External script sources are not allowed/
  );
});

test("extractMarkupText preserves text while removing balanced nested markup and comments", () => {
  assert.equal(
    extractMarkupText('Before <!-- hidden --><span class="label">inside <strong>nested</strong></span> after'),
    "Before inside nested after"
  );
  assert.equal(extractMarkupText("1 < 2 and 3 > 2<br>done"), "1 < 2 and 3 > 2done");
});

test("extractMarkupText rejects malformed or active markup", () => {
  assert.throws(() => extractMarkupText("<span>unfinished"), /Unclosed <span> element/);
  assert.throws(() => extractMarkupText("<strong>wrong</em>"), /Mismatched <\/em> end tag/);
  assert.throws(() => extractMarkupText("safe<script>alert(1)</script>"), /Unsafe <script> content/);
  assert.throws(() => extractMarkupText("safe<style>body { display: none }</style>"), /Unsafe <style> content/);
  assert.throws(() => extractMarkupText("safe<!-- unfinished"), /Unclosed HTML comment/);
});

test("release tuple helpers reject unsafe package names and versions", () => {
  assert.equal(assertStableReleaseVersion("0.3.143"), "0.3.143");
  assert.equal(assertReleasePackageName("hsqlite-editor"), "hsqlite-editor");
  assert.equal(getReleaseTag("hsqlite-editor", "0.3.143"), "hsqlite-editor-v0.3.143");
  assert.match(getReleaseArtifactPath("/tmp/release", "0.3.143"), /hSQLite-Editor-v0\.3\.143\.html$/);

  for (const version of [
    "0.3.143/../../x",
    "0.3.143%2f..",
    "0.3.143<script>",
    '0.3.143"',
    "0.3.143 ",
    "0.3.143\n"
  ]) {
    assert.throws(() => assertStableReleaseVersion(version), /Invalid stable release version/);
  }
  for (const packageName of ["../hsqlite-editor", "hsqlite/editor", "hsqlite editor", "hsqlite%2feditor"]) {
    assert.throws(() => assertReleasePackageName(packageName), /Invalid release package name/);
  }
});
