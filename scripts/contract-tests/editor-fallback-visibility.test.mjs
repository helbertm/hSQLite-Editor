import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const template = fs.readFileSync(path.join(rootDir, "src/index.template.html"), "utf8");
const editorStyles = fs.readFileSync(path.join(rootDir, "src/styles/11-feature-editor.css"), "utf8");
const adapter = fs.readFileSync(path.join(rootDir, "src/editor/codemirror6-adapter.mjs"), "utf8");
const editorRuntime = fs.readFileSync(path.join(rootDir, "src/capabilities/32-editor-runtime.js"), "utf8");

test("Plain textarea remains an available fallback before the rich editor loads", () => {
  const textarea = template.match(/<textarea id="sqlEditor"[^>]*>/)?.[0] || "";

  assert.ok(textarea);
  assert.doesNotMatch(textarea, /\shidden(?:\s|=|>)/);
  assert.match(textarea, /aria-label=/);
});

test("Rich-editor mode removes the textarea fallback from visual layout", () => {
  assert.match(adapter, /textarea\.hidden = true/);
  assert.match(
    editorStyles,
    /\.editor-wrap textarea\[hidden\]\s*\{\s*display:\s*none;\s*\}/
  );
});

test("Fallback stays visible until rich-editor initialization succeeds", () => {
  const editorConstruction = adapter.indexOf("view = new EditorView");
  const fallbackHide = adapter.indexOf("textarea.hidden = true");

  assert.ok(editorConstruction >= 0);
  assert.ok(fallbackHide > editorConstruction);
  assert.match(
    adapter,
    /catch \(error\)\s*\{\s*host\.remove\(\);\s*textarea\.hidden = false;\s*throw error;/
  );
  assert.match(
    editorRuntime,
    /catch \(error\)\s*\{\s*sqlEditor\.hidden = false;\s*console\.error\(`\$\{APP_LOG_PREFIX\} editor-runtime-initialization-failed`, error\);\s*setStatus\(t\("editor\.runtimeFallback"\), "warn"\);\s*return;/
  );
});

test("Destroying the rich editor restores a synchronized textarea fallback", () => {
  const destroy = adapter.match(/destroy\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] || "";

  assert.match(destroy, /textarea\.value = view\.state\.doc\.toString\(\)/);
  assert.match(destroy, /view\.destroy\(\)/);
  assert.match(destroy, /host\.remove\(\)/);
  assert.match(destroy, /textarea\.hidden = false/);
});
