import fs from "node:fs";
import path from "node:path";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function assertStableReleaseVersion(value) {
  const version = String(value ?? "");
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error(`Invalid stable release version: ${JSON.stringify(version)}`);
  }
  return version;
}

export function assertReleasePackageName(value) {
  const packageName = String(value ?? "");
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
    throw new Error(`Invalid release package name: ${JSON.stringify(packageName)}`);
  }
  return packageName;
}

function findTagEnd(source, startIndex) {
  let quote = "";
  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === ">") return index;
  }
  return -1;
}

function isTagNameBoundary(character) {
  return character === ">" || character === "/" || /\s/.test(character || "");
}

function readAttributeNames(source, startIndex, endIndex) {
  const names = [];
  let cursor = startIndex;
  while (cursor < endIndex) {
    while (cursor < endIndex && (/\s/.test(source[cursor]) || source[cursor] === "/")) cursor += 1;
    if (cursor >= endIndex) break;

    const nameStart = cursor;
    while (cursor < endIndex && !/[\s=/>]/.test(source[cursor])) cursor += 1;
    if (cursor === nameStart) {
      cursor += 1;
      continue;
    }
    names.push(source.slice(nameStart, cursor).toLowerCase());

    while (cursor < endIndex && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== "=") continue;
    cursor += 1;
    while (cursor < endIndex && /\s/.test(source[cursor])) cursor += 1;

    const quote = source[cursor] === '"' || source[cursor] === "'" ? source[cursor] : "";
    if (quote) {
      cursor += 1;
      while (cursor < endIndex && source[cursor] !== quote) cursor += 1;
      if (source[cursor] === quote) cursor += 1;
      continue;
    }
    while (cursor < endIndex && !/[\s>]/.test(source[cursor])) cursor += 1;
  }
  return names;
}

const HTML_VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"
]);

function readTagName(source, startIndex, endIndex) {
  let cursor = startIndex;
  if (source[cursor] === "/") cursor += 1;
  while (cursor < endIndex && /\s/.test(source[cursor])) cursor += 1;
  const nameStart = cursor;
  while (cursor < endIndex && /[A-Za-z0-9:-]/.test(source[cursor])) cursor += 1;
  return source.slice(nameStart, cursor).toLowerCase();
}

export function extractMarkupText(markup) {
  const source = String(markup);
  const openElements = [];
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    const tagStart = source.indexOf("<", cursor);
    if (tagStart === -1) {
      output += source.slice(cursor);
      break;
    }
    output += source.slice(cursor, tagStart);

    if (source.startsWith("<!--", tagStart)) {
      const commentEnd = source.indexOf("-->", tagStart + 4);
      if (commentEnd === -1) throw new Error("Unclosed HTML comment.");
      cursor = commentEnd + 3;
      continue;
    }

    const candidateStart = source[tagStart + 1] === "/" ? tagStart + 2 : tagStart + 1;
    if (!/[A-Za-z]/.test(source[candidateStart] || "")) {
      output += "<";
      cursor = tagStart + 1;
      continue;
    }

    const tagEnd = findTagEnd(source, candidateStart);
    if (tagEnd === -1) throw new Error("Unclosed HTML tag.");
    const tagName = readTagName(source, tagStart + 1, tagEnd);
    if (!tagName) throw new Error("HTML tag has no valid name.");
    if (tagName === "script" || tagName === "style") {
      throw new Error(`Unsafe <${tagName}> content is not allowed.`);
    }

    const isClosing = source[tagStart + 1] === "/";
    const isSelfClosing = source.slice(tagStart + 1, tagEnd).trimEnd().endsWith("/");
    if (isClosing) {
      if (openElements.at(-1) !== tagName) {
        throw new Error(`Mismatched </${tagName}> end tag.`);
      }
      openElements.pop();
    } else if (!isSelfClosing && !HTML_VOID_ELEMENTS.has(tagName)) {
      openElements.push(tagName);
    }
    cursor = tagEnd + 1;
  }

  if (openElements.length) {
    throw new Error(`Unclosed <${openElements.at(-1)}> element.`);
  }
  return output;
}

export function extractInlineScripts(markup) {
  const source = String(markup);
  const normalized = source.toLowerCase();
  const scripts = [];
  let cursor = 0;

  while (cursor < source.length) {
    const tagStart = normalized.indexOf("<", cursor);
    if (tagStart === -1) break;

    if (normalized.startsWith("<!--", tagStart)) {
      const commentEnd = normalized.indexOf("-->", tagStart + 4);
      cursor = commentEnd === -1 ? source.length : commentEnd + 3;
      continue;
    }

    const openNameEnd = tagStart + "<script".length;
    if (!normalized.startsWith("<script", tagStart) || !isTagNameBoundary(source[openNameEnd])) {
      cursor = tagStart + 1;
      continue;
    }

    const openTagEnd = findTagEnd(source, openNameEnd);
    if (openTagEnd === -1) throw new Error("Unclosed <script> start tag.");
    if (readAttributeNames(source, openNameEnd, openTagEnd).includes("src")) {
      throw new Error("External script sources are not allowed in the standalone artifact.");
    }

    let closeTagStart = normalized.indexOf("</script", openTagEnd + 1);
    while (closeTagStart !== -1 && !isTagNameBoundary(source[closeTagStart + "</script".length])) {
      closeTagStart = normalized.indexOf("</script", closeTagStart + 1);
    }
    if (closeTagStart === -1) throw new Error("Unclosed <script> element.");

    const closeTagEnd = findTagEnd(source, closeTagStart + "</script".length);
    if (closeTagEnd === -1) throw new Error("Unclosed </script> end tag.");

    scripts.push(source.slice(openTagEnd + 1, closeTagStart));
    cursor = closeTagEnd + 1;
  }

  return scripts;
}

export function collapseTagWhitespace(html) {
  return html
    .replace(/>\s+</g, "><")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function minifyStandaloneHtml(html) {
  return collapseTagWhitespace(html);
}

export function getReleaseArtifactPath(rootDir, version) {
  return path.join(rootDir, "dist", `hSQLite-Editor-v${assertStableReleaseVersion(version)}.html`);
}

export function getReleaseTag(packageName, version) {
  return `${assertReleasePackageName(packageName)}-v${assertStableReleaseVersion(version)}`;
}
