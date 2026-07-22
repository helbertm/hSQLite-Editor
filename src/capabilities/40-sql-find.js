import { cmEditor, sqlFindCount, sqlFindInput, sqlFindPanel, sqlFindToggleReplaceBtn, sqlReplaceInput } from "./03-dom-editor-results.js";
import { formatNumber, t } from "./03-localization.js";
import { setStatus } from "./12-shell-status.js";
import { saveCurrentTabState } from "./22c-active-tab-sync.js";
import { getEditorCursorIndex, getEditorValue } from "./32a-editor-api.js";
import { getSqlFindState, setEditorState } from "../core/15-state-runtime-library.js";

export function clearSqlFindMarks() {
  if (cmEditor) cmEditor.clearSearchHighlights();
}

export function collectSqlFindMatches(query) {
  if (!cmEditor || !query) return [];

  const matches = [];
  const text = getEditorValue();
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let index = lowerText.indexOf(lowerQuery);
  while (index >= 0) {
    matches.push({ from: index, to: index + query.length });
    index = lowerText.indexOf(lowerQuery, index + Math.max(query.length, 1));
  }

  return matches;
}

export function markSqlFindMatches() {
  clearSqlFindMarks();

  const sqlFindState = getSqlFindState();
  if (!cmEditor || !sqlFindState.query) return;

  cmEditor.setSearchHighlights(sqlFindState.matches, sqlFindState.index);
}

export function updateSqlFindCount() {
  const sqlFindState = getSqlFindState();
  const total = sqlFindState.matches.length;
  const current = total ? sqlFindState.index + 1 : 0;
  sqlFindCount.textContent = `${current}/${total}`;
  sqlFindCount.classList.toggle("no-match", Boolean(sqlFindState.query) && total === 0);
}

export function refreshSqlFindMatches(keepNearCursor = false) {
  const sqlFindState = getSqlFindState();
  const previous = keepNearCursor && sqlFindState.matches[sqlFindState.index]
    ? sqlFindState.matches[sqlFindState.index].from
    : null;

  const nextSqlFindState = {
    ...sqlFindState,
    query: sqlFindInput.value,
    matches: collectSqlFindMatches(sqlFindInput.value)
  };

  if (!nextSqlFindState.matches.length) {
    nextSqlFindState.index = -1;
  } else if (previous !== null) {
    const foundIndex = nextSqlFindState.matches.findIndex(match => match.from >= previous);
    nextSqlFindState.index = foundIndex >= 0 ? foundIndex : 0;
  } else {
    const cursor = getEditorCursorIndex();
    const afterCursor = nextSqlFindState.matches.findIndex(match => match.from >= cursor);
    nextSqlFindState.index = afterCursor >= 0 ? afterCursor : 0;
  }

  setEditorState({ sqlFind: nextSqlFindState });
  markSqlFindMatches();
  updateSqlFindCount();

  if (nextSqlFindState.index >= 0) {
    goToSqlFindMatch(nextSqlFindState.index, false);
  }
}

export function goToSqlFindMatch(index, remark = true) {
  const sqlFindState = getSqlFindState();
  if (!cmEditor || !sqlFindState.matches.length) return;

  const nextIndex = (index + sqlFindState.matches.length) % sqlFindState.matches.length;
  const match = sqlFindState.matches[nextIndex];
  setEditorState({
    sqlFind: {
      ...sqlFindState,
      index: nextIndex
    }
  });

  cmEditor.setSelection(match.from, match.to);
  cmEditor.scrollIntoView(match.from, 80);

  if (remark) {
    markSqlFindMatches();
    updateSqlFindCount();
  }
}

export const sqlFindController = {
  findNext() {
    const sqlFindState = getSqlFindState();
    if (!sqlFindState.matches.length) {
      refreshSqlFindMatches();
      return;
    }
    goToSqlFindMatch(sqlFindState.index + 1);
  },
  findPrevious() {
    const sqlFindState = getSqlFindState();
    if (!sqlFindState.matches.length) {
      refreshSqlFindMatches();
      return;
    }
    goToSqlFindMatch(sqlFindState.index - 1);
  },
  open(replaceMode = false) {
    const sqlFindState = getSqlFindState();
    setEditorState({
      sqlFind: {
        ...sqlFindState,
        replacing: Boolean(replaceMode)
      }
    });
    sqlFindPanel.classList.add("open");
    sqlFindPanel.classList.toggle("replace-mode", Boolean(replaceMode));
    sqlFindToggleReplaceBtn.textContent = t(replaceMode ? "editor.replaceHide" : "editor.replace");

    if (cmEditor) {
      const selected = cmEditor.getSelection();
      if (selected && !selected.includes("\n")) {
        sqlFindInput.value = selected;
      }
    }

    refreshSqlFindMatches();
    setTimeout(() => {
      sqlFindInput.focus();
      sqlFindInput.select();
    }, 0);
  },
  close() {
    sqlFindPanel.classList.remove("open");
    clearSqlFindMarks();
    const sqlFindState = getSqlFindState();
    setEditorState({
      sqlFind: {
        ...sqlFindState,
        matches: [],
        index: -1
      }
    });
    updateSqlFindCount();
    if (cmEditor) cmEditor.focus();
  },
  toggleReplaceMode() {
    const sqlFindState = getSqlFindState();
    const replacing = !sqlFindState.replacing;
    setEditorState({
      sqlFind: {
        ...sqlFindState,
        replacing
      }
    });
    sqlFindPanel.classList.toggle("replace-mode", replacing);
    sqlFindToggleReplaceBtn.textContent = t(replacing ? "editor.replaceHide" : "editor.replace");

    if (replacing) {
      setTimeout(() => sqlReplaceInput.focus(), 0);
    }
  },
  replaceCurrent() {
    if (!cmEditor) return;

    const sqlFindState = getSqlFindState();
    if (!sqlFindState.matches.length) {
      refreshSqlFindMatches();
      if (!getSqlFindState().matches.length) return;
    }

    const nextSqlFindState = getSqlFindState();
    const match = nextSqlFindState.matches[nextSqlFindState.index];
    cmEditor.replaceRange(match.from, match.to, sqlReplaceInput.value);
    saveCurrentTabState();
    refreshSqlFindMatches(true);
  },
  replaceAll() {
    if (!cmEditor || !sqlFindInput.value) return;

    const matches = collectSqlFindMatches(sqlFindInput.value);

    if (!matches.length) {
      refreshSqlFindMatches();
      return;
    }

    cmEditor.replaceRanges(matches.map(match => ({
      from: match.from,
      to: match.to,
      text: sqlReplaceInput.value
    })));

    saveCurrentTabState();
    refreshSqlFindMatches();
    setStatus(t("find.replaced", { count: formatNumber(matches.length) }), "ok");
  }
};

export function findNextSqlMatch() {
  sqlFindController.findNext();
}

export function findPreviousSqlMatch() {
  sqlFindController.findPrevious();
}

export function openSqlFindPanel(replaceMode = false) {
  sqlFindController.open(replaceMode);
}

export function closeSqlFindPanel() {
  sqlFindController.close();
}

export function toggleSqlReplaceMode() {
  sqlFindController.toggleReplaceMode();
}

export function replaceCurrentSqlMatch() {
  sqlFindController.replaceCurrent();
}

export function replaceAllSqlMatches() {
  sqlFindController.replaceAll();
}
