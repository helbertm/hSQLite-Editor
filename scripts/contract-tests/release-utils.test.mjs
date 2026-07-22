import assert from "node:assert/strict";
import test from "node:test";
import {
  assertReleasePackageName,
  assertStableReleaseVersion,
  escapeRegExp,
  extractInlineScripts,
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
