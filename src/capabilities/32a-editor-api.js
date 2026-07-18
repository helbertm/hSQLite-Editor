import { cmEditor, sqlEditor } from "./03-dom-editor-results.js";

let onEditorValueSet = () => {};

export function configureEditorApiEffects(effects) {
  onEditorValueSet = effects.onEditorValueSet;
}

export function getEditorValue() {
  return cmEditor ? cmEditor.getValue() : sqlEditor.value;
}

export function setEditorValue(value) {
  if (cmEditor) {
    cmEditor.setValue(value);
    cmEditor.focus();
    setTimeout(() => cmEditor.refresh(), 0);
  } else {
    sqlEditor.value = value;
    sqlEditor.focus();
  }
  onEditorValueSet();
}

export function getEditorSelection() {
  return cmEditor ? cmEditor.getSelection() : sqlEditor.value.substring(sqlEditor.selectionStart, sqlEditor.selectionEnd);
}

export function getEditorCursorIndex() {
  return cmEditor ? cmEditor.getCursorIndex() : sqlEditor.selectionStart;
}

export function replaceEditorRange(fromIndex, toIndex, text) {
  if (cmEditor) {
    cmEditor.replaceRange(fromIndex, toIndex, text);
    cmEditor.focus();
  } else {
    const value = sqlEditor.value;
    sqlEditor.value = value.slice(0, fromIndex) + text + value.slice(toIndex);
    sqlEditor.focus();
    sqlEditor.selectionStart = sqlEditor.selectionEnd = fromIndex + text.length;
  }
}
