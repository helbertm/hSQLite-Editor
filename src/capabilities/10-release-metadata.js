import { setInlineBadge } from "./01-inline-badge.js";
import { t } from "./03-localization.js";
import { releaseNotesBadge, releaseNotesBtn, releaseNotesContent, releaseNotesModal, releaseNotesSummary } from "./05-dom-library-settings.js";
import { modalController } from "./05-modal-controller.js";
import { createReleaseMetadata } from "../core/00-contracts.js";
import { BOOT } from "../core/08-runtime-config.js";
import { getAppVersion, getReleaseNotesByVersion, getReleaseVersions, setReleaseState } from "../core/15-state-runtime-library.js";
import { STORAGE_KEYS, storage } from "../ports/05-storage.js";
import { escapeHtml } from "../ui/00-helpers.js";

export function setReleaseBadgeState(options) {
    setInlineBadge(releaseNotesBadge, options);
  }

  export function getPendingReleaseVersions(currentVersion = getAppVersion(), seenVersion = storage.get(STORAGE_KEYS.LAST_SEEN_RELEASE_VERSION, "")) {
    return getReleaseVersionsForModal(currentVersion, seenVersion);
  }

  export function updateReleaseNotesButtonLabel(pendingCount) {
    if (!releaseNotesBtn) return;
    const baseLabel = t("release.title");
    if (pendingCount > 0) {
      const suffix = t(pendingCount === 1 ? "release.newVersion" : "release.newVersions", { count: pendingCount });
      releaseNotesBtn.setAttribute("aria-label", `${baseLabel} (${suffix})`);
      releaseNotesBtn.title = `${baseLabel} (${suffix})`;
      return;
    }
    releaseNotesBtn.setAttribute("aria-label", baseLabel);
    releaseNotesBtn.title = baseLabel;
  }

  export function markReleaseVersionAsSeen() {
    storage.set(STORAGE_KEYS.LAST_SEEN_RELEASE_VERSION, getAppVersion());
    setReleaseBadgeState({ visible: false });
    updateReleaseNotesButtonLabel(0);
  }

  export function buildReleaseNotesList(version) {
    const notesByVersion = getReleaseNotesByVersion();
    const notes = (notesByVersion[version] || ["Melhorias gerais de estabilidade e usabilidade."])
      .map(normalizeReleaseNoteForUsers)
      .filter(Boolean)
      .slice(0, 8);
    return `<ul>${notes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  export function parseSemver(version) {
    const match = String(version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) return null;
    return [Number(match[1]), Number(match[2]), Number(match[3])];
  }

  export function compareSemver(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb) return String(a).localeCompare(String(b));
    for (let i = 0; i < 3; i++) {
      if (pa[i] !== pb[i]) return pa[i] - pb[i];
    }
    return 0;
  }

  export function normalizeReleaseNoteForUsers(rawNote) {
    if (!rawNote) return "";
    let note = String(rawNote).trim();

    note = note
      .replace(/\s*\(\[[a-f0-9]{7,}\]\([^)]+\)\)\s*$/i, "")
      .replace(/\s*\([a-f0-9]{7,}\)\s*$/i, "")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi, "$1")
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    const typeMatch = note.match(/^(feat|fix|chore|docs|refactor|perf|build|ci|test)(\([^)]+\))?!?:\s*(.+)$/i);
    if (typeMatch) {
      const type = typeMatch[1].toLowerCase();
      const message = String(typeMatch[3] || "").trim();
      if (["build", "ci", "test"].includes(type)) return "";
      if (type === "chore" && /(release|metadata|version|artifact|release-please|build)/i.test(message)) return "";
      const labels = {
        feat: t("release.typeFeature"),
        fix: t("release.typeFix"),
        chore: t("release.typeChore"),
        docs: t("release.typeDocs"),
        refactor: t("release.typeRefactor"),
        perf: t("release.typePerformance"),
        build: "Build",
        ci: t("release.typeAutomation"),
        test: t("release.typeTest")
      };
      const label = labels[type] || t("release.typeUpdate");
      note = `${label}: ${message}`;
    }
    return note;
  }

  export function getReleaseVersionsForModal(currentVersion, seenVersion) {
    if (!currentVersion) return [];
    if (!seenVersion || seenVersion === currentVersion) return [currentVersion];

    const releaseVersions = getReleaseVersions();
    const available = releaseVersions.length ? releaseVersions : [currentVersion];
    const currentIndex = available.indexOf(currentVersion);
    if (currentIndex === -1) return [currentVersion];

    const seenIndex = available.indexOf(seenVersion);
    if (seenIndex !== -1) {
      if (seenIndex <= currentIndex) return [currentVersion];
      return available.slice(currentIndex, seenIndex);
    }

    const filtered = available.filter(v => compareSemver(v, currentVersion) <= 0 && compareSemver(v, seenVersion) > 0);
    return filtered.length ? filtered : [currentVersion];
  }

  export function buildReleaseNotesHistoryHtml(versions) {
    const items = versions.filter(Boolean);
    if (!items.length) return buildReleaseNotesList(getAppVersion());

    return items.map((version) => {
      const notes = (getReleaseNotesByVersion()[version] || ["Melhorias gerais de estabilidade e usabilidade."])
        .map(normalizeReleaseNoteForUsers)
        .filter(Boolean)
        .slice(0, 8);
      return `<section><h4 style="margin:0 0 6px;">v${escapeHtml(version)}</h4><ul>${notes.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`;
    }).join("");
  }

  export async function loadReleaseMetadataFromRepoFiles() {
    const release = createReleaseMetadata(BOOT.release || {});
    const nextVersion = release.version || getAppVersion();
    const currentNotes = getReleaseNotesByVersion();
    const nextNotesByVersion = Object.fromEntries(
      Object.entries(release.notesByVersion || currentNotes).map(([version, notes]) => [
        version,
        (Array.isArray(notes) ? notes : [])
          .map(normalizeReleaseNoteForUsers)
          .filter(Boolean)
          .slice(0, 8)
      ])
    );
    const nextVersions = Array.isArray(release.versions) && release.versions.length
      ? [...release.versions]
      : [nextVersion];
    setReleaseState({
      version: nextVersion,
      notesByVersion: nextNotesByVersion,
      versions: nextVersions
    });
  }

  export function openReleaseNotesModal(markAsSeen = true) {
    const appVersion = getAppVersion();
    const seenVersion = storage.get(STORAGE_KEYS.LAST_SEEN_RELEASE_VERSION, "");
    const versionsToShow = getReleaseVersionsForModal(appVersion, seenVersion);

    if (releaseNotesSummary) {
      if (!seenVersion || seenVersion === appVersion || versionsToShow.length === 1) {
        releaseNotesSummary.textContent = t("release.updatedTo", { version: appVersion });
      } else {
        releaseNotesSummary.textContent = t("release.updatedFrom", { from: seenVersion, to: appVersion });
      }
    }
    if (releaseNotesContent) {
      releaseNotesContent.innerHTML = buildReleaseNotesHistoryHtml(versionsToShow);
    }
    modalController.open(releaseNotesModal);
    if (markAsSeen) markReleaseVersionAsSeen();
  }

  export function evaluateReleaseNotesUpdate() {
    const versionPill = document.getElementById("appVersionPill");
    const appVersion = getAppVersion();
    if (versionPill) versionPill.textContent = `v${appVersion}`;
    const seenVersion = storage.get(STORAGE_KEYS.LAST_SEEN_RELEASE_VERSION, "");
    const pendingVersions = getPendingReleaseVersions(appVersion, seenVersion);
    const pendingCount = seenVersion !== appVersion ? pendingVersions.length : 0;
    setReleaseBadgeState({
      visible: pendingCount > 0,
      mode: "count",
      tone: "danger",
      count: pendingCount
    });
    updateReleaseNotesButtonLabel(pendingCount);
  }
