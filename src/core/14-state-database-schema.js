import { createDbSession } from "./00-contracts.js";
import { appState } from "./10-state-root.js";

export function getDbSessionState() {
    return appState.dbSession;
  }

export function getSchemaState() {
    return appState.schema;
  }

export function getSchemaObjects() {
    return appState.schema.objects;
  }

export function getSchemaAvailableTypes() {
    return appState.schema.availableTypes;
  }

export function getSqlMapState() {
    return appState.sqlMap;
  }

export function getCurrentDbSession() {
    return appState.dbSession.current;
  }

export function getCurrentDbSessionId() {
    return appState.dbSession.currentId;
  }

export function getCurrentDbFileName() {
    return appState.dbSession.currentFileName;
  }

export function getCurrentDbBytes() {
    return appState.dbSession.currentBytes;
  }

export function isCurrentDbDirty() {
    return appState.dbSession.isDirty;
  }

export function setSchemaState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "objects")) {
      appState.schema.objects = patch.objects && typeof patch.objects === "object" ? patch.objects : {};
    }
    if (Object.prototype.hasOwnProperty.call(patch, "availableTypes")) {
      appState.schema.availableTypes = Array.isArray(patch.availableTypes) ? patch.availableTypes : [];
    }
  }

export function setSqlMapState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "open")) {
      appState.sqlMap.open = Boolean(patch.open);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "tables")) {
      appState.sqlMap.tables = patch.tables && typeof patch.tables === "object" ? patch.tables : {};
    }
    if (Object.prototype.hasOwnProperty.call(patch, "declaredFks")) {
      appState.sqlMap.declaredFks = Array.isArray(patch.declaredFks) ? patch.declaredFks : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "virtualFks")) {
      appState.sqlMap.virtualFks = Array.isArray(patch.virtualFks) ? patch.virtualFks : [];
    }
    if (Object.prototype.hasOwnProperty.call(patch, "selectedTables")) {
      appState.sqlMap.selectedTables = patch.selectedTables instanceof Set ? patch.selectedTables : new Set();
    }
    if (Object.prototype.hasOwnProperty.call(patch, "selectedFields")) {
      appState.sqlMap.selectedFields = patch.selectedFields instanceof Map ? patch.selectedFields : new Map();
    }
    if (Object.prototype.hasOwnProperty.call(patch, "positions")) {
      appState.sqlMap.positions = patch.positions && typeof patch.positions === "object" ? patch.positions : {};
    }
    if (Object.prototype.hasOwnProperty.call(patch, "generatedSql")) {
      appState.sqlMap.generatedSql = String(patch.generatedSql || "");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "pendingRelationDraft")) {
      appState.sqlMap.pendingRelationDraft = patch.pendingRelationDraft || null;
    }
  }

export function setDbSessionState(patch) {
    if (Object.prototype.hasOwnProperty.call(patch, "current")) {
      appState.dbSession.current = createDbSession(patch.current || {});
    }
    if (Object.prototype.hasOwnProperty.call(patch, "currentId")) {
      appState.dbSession.currentId = String(patch.currentId || "no-database");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "currentFileName")) {
      appState.dbSession.currentFileName = String(patch.currentFileName || "");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "currentBytes")) {
      appState.dbSession.currentBytes = patch.currentBytes;
    }
    if (Object.prototype.hasOwnProperty.call(patch, "isDirty")) {
      appState.dbSession.isDirty = Boolean(patch.isDirty);
    }
  }
